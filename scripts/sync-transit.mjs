import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const endpoint = "https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl";
const json = async (name) => JSON.parse(await readFile(path.join(root, "data", name), "utf8"));

// GTFS CSV permits quoted commas, escaped quotes and CRLF. Never split rows on commas.
export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift()?.map((header) => header.replace(/^\uFEFF/, "")) ?? [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

const names = {
  KJ15: "KL Sentral", KJ16: "Bangsar", KJ11: "Kampung Baru", AG6: "Bandaraya", SP6: "Bandaraya",
  SP22: "Kinrara BK5", PY14: "Kentonmen", KG20: "Tun Razak Exchange (TRX)", PY23: "Tun Razak Exchange (TRX)"
};
const acronyms = new Set(["KL", "KLCC", "USJ", "SS", "UPM", "PWTC", "IOI", "BK5", "SA"]);
const titleCase = (name) => name.trim().toLowerCase().replace(/\b[a-z][a-z0-9]*/g, (word) =>
  word.toUpperCase() === "UITM" ? "UiTM" : acronyms.has(word.toUpperCase()) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1));
const normalize = (name) => name.replace(/\([^)]*\)/g, "").replace(/ - .+$/, "").trim().toLowerCase()
  .replace(/^ttdi$/, "taman tun dr ismail").replace(/^trx$/, "tun razak exchange").replace(/^seri serdang$/, "serdang jaya");
const slug = (name) => normalize(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function buildRapidStations({ routes, trips, stopTimes, stops }, lines, previous = []) {
  const stopIndex = new Map(stops.map((stop) => [stop.stop_id, stop]));
  const tripIndex = new Map(trips.map((trip) => [trip.trip_id, trip]));
  const usedIds = new Set();
  const result = [];
  for (const line of lines.filter((line) => line.type !== "ERL")) {
    const route = routes.find((route) => route.route_id === line.id);
    if (!route || route.status !== "valid") throw new Error(`Missing operational route ${line.id}`);
    // The feed's stop.route_id is not reliable for Kajang or interchange membership.
    // Derive served stops from route -> trip -> stop_times, never stop.route_id.
    const served = new Map();
    for (const time of stopTimes) {
      const trip = tripIndex.get(time.trip_id);
      if (trip?.route_id !== line.id) continue;
      if (!stopIndex.has(time.stop_id)) throw new Error(`Missing stop ${time.stop_id}`);
      served.set(time.stop_id, stopIndex.get(time.stop_id));
    }
    if (served.size !== line.stationCount) {
      throw new Error(`${line.name}: feed has ${served.size} stops; reviewed count is ${line.stationCount}. Review operating status before changing metadata.`);
    }
    // Public stop codes follow the line alignment in this feed (including deliberate gaps).
    const ordered = [...served.values()].sort((a, b) => a.stop_id.localeCompare(b.stop_id, "en", { numeric: true }));
    for (const stop of ordered) {
      if (stop.status !== "valid") throw new Error(`Stop ${stop.stop_id} is not valid`);
      const name = names[stop.stop_id] ?? titleCase(stop.stop_name);
      const lat = Number(stop.stop_lat), lng = Number(stop.stop_lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 2.5 || lat > 3.5 || lng < 101 || lng > 102) {
        throw new Error(`Invalid Klang Valley coordinates at ${stop.stop_id}`);
      }
      const old = previous.find((station) => !usedIds.has(station.id) && (
        (station.line_id === line.id && station.station_code === stop.stop_id) ||
        (!station.station_code && normalize(station.name) === normalize(name) && (
          station.line_name === line.name || (station.line_name === "LRT Ampang/Sri Petaling" && ["AG", "PH"].includes(line.id))
        ))
      ));
      let id = old?.id ?? `${slug(name)}-${line.id.toLowerCase()}`;
      if (stop.stop_id === "PY33") id = "serdang-jaya";
      if (stop.stop_id === "PY18") id = "hospital-kuala-lumpur";
      if (usedIds.has(id)) throw new Error(`Duplicate station id ${id}`);
      usedIds.add(id);
      result.push({ id, name, line_type: line.type, line_name: line.name, lat, lng,
        line_id: line.id, station_code: stop.stop_id, source: "prasarana_gtfs" });
    }
  }
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf("--feed-dir");
  let directory;
  if (dirIndex >= 0) {
    if (!args[dirIndex + 1]) throw new Error("--feed-dir requires an extracted GTFS directory");
    directory = path.resolve(args[dirIndex + 1]);
  } else {
    directory = await mkdtemp(path.join(tmpdir(), "masjid-transit-"));
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`GTFS download failed (${response.status})`);
    const archive = path.join(directory, "feed.zip");
    await writeFile(archive, Buffer.from(await response.arrayBuffer()));
    const extracted = path.join(directory, "feed");
    await mkdir(extracted);
    if (process.platform === "win32") {
      const quote = (value) => `'${value.replaceAll("'", "''")}'`;
      execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
        `[void][Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem'); [IO.Compression.ZipFile]::ExtractToDirectory(${quote(archive)}, ${quote(extracted)})`]);
    } else execFileSync("unzip", ["-q", archive, "-d", extracted]);
    directory = extracted;
  }
  const [metadata, previous, erl] = await Promise.all([json("transit-lines.json"), json("stations.my.json"), json("erl-stations.json")]);
  const hashes = {};
  const feed = {};
  for (const [key, filename] of Object.entries({ routes: "routes.txt", trips: "trips.txt", stopTimes: "stop_times.txt", stops: "stops.txt" })) {
    const contents = await readFile(path.join(directory, filename));
    hashes[filename] = createHash("sha256").update(contents).digest("hex");
    feed[key] = parseCsv(contents.toString("utf8"));
  }
  const stations = buildRapidStations(feed, metadata.lines, previous);
  for (const line of metadata.lines.filter((line) => line.type === "ERL")) {
    const entries = erl.filter((station) => line.id === "ERL_TRANSIT" || station.express);
    if (entries.length !== line.stationCount) throw new Error(`ERL count mismatch for ${line.id}`);
    for (const { id, name, station_code, lat, lng, source } of entries) {
      stations.push({ id: line.id === "ERL_TRANSIT" ? id : `${id}-ekspres`, name, station_code, lat, lng, source,
        line_type: "ERL", line_name: line.name, line_id: line.id });
    }
  }
  const aliases = await json("station-id-aliases.json");
  if (new Set(stations.map((station) => station.id)).size !== stations.length) throw new Error("Duplicate generated ids");
  for (const target of Object.values(aliases)) {
    if (!stations.some((station) => station.id === target)) throw new Error(`Missing alias target ${target}`);
  }
  await writeFile(path.join(root, "data/stations.my.json"), JSON.stringify(stations, null, 2) + "\n");
  await writeFile(path.join(root, "data/transit-feed-provenance.json"), JSON.stringify({ endpoint, checkedAt: metadata.checkedAt, sha256: hashes }, null, 2) + "\n");
  console.log(`Updated ${stations.length} route-station entries across ${metadata.lines.length} operational lines.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
