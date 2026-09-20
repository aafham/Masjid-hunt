/**
 * Import a real Overpass export, never hand-authored fallback records.
 * Usage: node scripts/import-mosques.mjs path/to/export.json
 * Accepted input: an Overpass JSON response, or {data, retrievedAt, bounds, endpoint, query}.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/import-mosques.mjs <Overpass export JSON>");
const raw = JSON.parse((await readFile(resolve(input), "utf8")).replace(/^\uFEFF/, ""));
const data = raw.data || raw;
if (data.remark || !Array.isArray(data.elements) || !data.osm3s?.timestamp_osm_base) {
  throw new Error("Export must be complete and include the OSM replication timestamp.");
}
const bounds = raw.bounds || [2.70, 101.35, 3.28, 101.85];
if (bounds.length !== 4 || !bounds.every(Number.isFinite)) throw new Error("Invalid bounds");
const seen = new Set();
const mosques = data.elements.flatMap((element) => {
  const tags = element.tags || {};
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (tags.amenity !== "place_of_worship" || tags.religion !== "muslim") return [];
  if (["private", "no"].includes(tags.access) || tags.disused === "yes" || tags.abandoned === "yes" || tags.construction === "yes") return [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < bounds[0] || lng < bounds[1] || lat > bounds[2] || lng > bounds[3]) return [];
  if (!["node", "way", "relation"].includes(element.type) || !Number.isInteger(element.id)) return [];
  const placeId = `osm:${element.type}:${element.id}`;
  if (seen.has(placeId)) return [];
  seen.add(placeId);
  const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(", ");
  return [{
    placeId,
    name: (tags["name:ms"] || tags.name || "Tempat solat (nama belum tersedia)").trim(),
    lat, lng,
    ...(address ? { address } : {}),
    osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`
  }];
}).sort((a, b) => a.placeId.localeCompare(b.placeId));
if (!mosques.length) throw new Error("Refusing to replace data with an empty export.");
const output = {
  source: "OpenStreetMap contributors",
  license: "ODbL-1.0",
  attributionUrl: "https://www.openstreetmap.org/copyright",
  endpoint: raw.endpoint || "https://overpass.kumi.systems/api/interpreter",
  query: raw.query || '[out:json][timeout:90];nwr[amenity=place_of_worship][religion=muslim](2.70,101.35,3.28,101.85);out center tags;',
  retrievedAt: raw.retrievedAt || new Date().toISOString(),
  dataUpdatedAt: data.osm3s.timestamp_osm_base,
  bounds,
  notes: "OSM points and polygon centers; public access and entrances require local verification. Coverage may be incomplete.",
  mosques
};
await writeFile(new URL("../data/mosques.osm.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Imported ${mosques.length} OSM places. Data date ${output.dataUpdatedAt}; retrieved ${output.retrievedAt}.`);
