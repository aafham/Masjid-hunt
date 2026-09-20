import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { NextRequest } from "next/server";
import { parseCoordinates, parseRadius } from "../lib/coordinates";
import { ExpiringCache } from "../lib/server-cache";
import { findMosquesByStation } from "../lib/mosques";
import { getPrayerTimes, malaysiaDate, validPrayerDate } from "../lib/prayer-times";
import type { Station } from "../lib/types";
import { GET as mosqueRoute } from "../app/api/mosques/route";
import { GET as prayerRoute } from "../app/api/prayer-times/route";
import { GET as distanceRoute } from "../app/api/distance/route";
import { GET as embedRoute } from "../app/api/map-embed/route";

const savedFetch = globalThis.fetch;
const savedEnv = { ...process.env };
const station = (id: string): Station => ({ id, name: id, line_type: "LRT", line_name: "Test", lat: 3.1344, lng: 101.6861 });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const prayerDay = (date: string) => ({ date, fajr: "05:56:00", dhuhr: "13:10:00", asr: "16:14:00", maghrib: "19:12:00", isha: "20:21:00" });

function withoutKeys() {
  delete process.env.GOOGLE_PLACES_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_MAPS_EMBED_API_KEY;
  process.env.OVERPASS_API_URL = "https://overpass.example.test/api/interpreter";
}

afterEach(() => {
  globalThis.fetch = savedFetch;
  for (const key of ["GOOGLE_PLACES_API_KEY", "GOOGLE_MAPS_API_KEY", "GOOGLE_MAPS_EMBED_API_KEY", "OVERPASS_API_URL"]) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

test("strict coordinates reject malformed/range-invalid input while accepting zero", () => {
  for (const value of [null, "", ",", "3,", "3,101,2", "91,101", "3,181", "NaN,101", "1e2,101"]) assert.equal(parseCoordinates(value), null);
  assert.deepEqual(parseCoordinates("0,0"), { lat: 0, lng: 0 });
  assert.deepEqual(parseCoordinates(" -3.2, 101.4 "), { lat: -3.2, lng: 101.4 });
  for (const value of ["0", "4", "1.5", "NaN", "", " 2"]) assert.equal(parseRadius(value), null);
  assert.equal(parseRadius(null), 2);
  assert.equal(parseRadius("3"), 3);
});

test("bounded cache expires records and evicts oldest without unbounded growth", () => {
  const cache = new ExpiringCache<number>(2, 100);
  cache.set("a", 1, 0); cache.set("b", 2, 10); cache.set("c", 3, 20);
  assert.equal(cache.get("a", 21), undefined);
  assert.equal(cache.get("b", 21), 2);
  assert.equal(cache.get("b", 111), undefined);
  cache.set("d", 4, 200);
  assert.equal(cache.get("c", 200), undefined);
  assert.equal(cache.get("d", 201), 4);
});

test("successful Google ZERO_RESULTS remains empty and never queries OSM or demo", async () => {
  withoutKeys(); process.env.GOOGLE_PLACES_API_KEY = "private-test-key";
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls += 1;
    assert.match(String(input), /maps.googleapis.com\/maps\/api\/place/);
    return json({ status: "ZERO_RESULTS", results: [] });
  };
  const result = await findMosquesByStation(station("zero-result"), 1, "nearest");
  assert.equal(result.source, "google"); assert.deepEqual(result.mosques, []); assert.equal(calls, 1);
});

test("keyless OSM results are radius-filtered, deduplicated, attributed and have no walking ETA", async () => {
  withoutKeys();
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return json({ elements: [
      { type: "node", id: 1, lat: 3.135, lon: 101.6861, tags: { name: "Masjid nearby" } },
      { type: "node", id: 1, lat: 3.135, lon: 101.6861, tags: { name: "Duplicate" } },
      { type: "way", id: 2, center: { lat: 3.138, lon: 101.687 }, tags: { name: "Surau nearby" } },
      { type: "node", id: 3, lat: 3.3, lon: 101.7, tags: { name: "Far outside radius" } },
      { type: "node", id: 4, lat: 300, lon: 101.7, tags: { name: "Invalid" } }
    ] });
  };
  const selected = station("osm-radius");
  const first = await findMosquesByStation(selected, 1, "nearest");
  const second = await findMosquesByStation(selected, 1, "farthest");
  assert.equal(calls, 1, "sort changes use the same bounded cache");
  assert.equal(first.source, "openstreetmap"); assert.match(first.attribution.url, /copyright/);
  assert.deepEqual(first.mosques.map((m) => m.placeId), ["osm:node:1", "osm:way:2"]);
  assert.deepEqual(second.mosques.map((m) => m.placeId), ["osm:way:2", "osm:node:1"]);
  for (const mosque of first.mosques) {
    assert.equal(mosque.distanceType, "haversine_estimate"); assert.equal(mosque.durationMinutes, undefined);
    assert.ok(mosque.distanceMeters! <= 1000); assert.match(mosque.osmUrl!, /openstreetmap.org/);
  }
});

test("Google failure uses actual OSM with warning; failed providers never become empty success", async () => {
  withoutKeys(); process.env.GOOGLE_PLACES_API_KEY = "private-test-key";
  globalThis.fetch = async (input) => String(input).includes("maps.googleapis.com")
    ? json({ status: "REQUEST_DENIED" })
    : json({ elements: [{ type: "node", id: 10, lat: 3.135, lon: 101.6861, tags: { name: "Masjid real" } }] });
  const result = await findMosquesByStation(station("google-failure"), 1, "nearest");
  assert.equal(result.source, "openstreetmap"); assert.match(result.warning!, /Google/); assert.equal(result.mosques.length, 1);
  withoutKeys(); globalThis.fetch = async () => json({ elements: [], remark: "runtime error: timeout" });
  const fallback = await findMosquesByStation(station("osm-failure"), 1, "nearest");
  assert.equal(fallback.sourceMode, "snapshot");
  assert.match(fallback.warning!, /salinan data/);
  assert.ok(fallback.mosques.length > 0);
});

test("walking distance beyond selected radius is excluded and failed routes do not invent ETA", async () => {
  withoutKeys(); process.env.GOOGLE_MAPS_API_KEY = "server-test-key";
  globalThis.fetch = async (input) => String(input).includes("nearbysearch")
    ? json({ status: "OK", results: [
        { place_id: "within", name: "Near mosque", geometry: { location: { lat: 3.135, lng: 101.6861 } } },
        { place_id: "over", name: "Far walk", geometry: { location: { lat: 3.136, lng: 101.6861 } } },
        { place_id: "unknown", name: "No walking data", geometry: { location: { lat: 3.137, lng: 101.6861 } } }
      ] })
    : json({ status: "OK", rows: [{ elements: [
        { status: "OK", distance: { value: 100 }, duration: { value: 120 } },
        { status: "OK", distance: { value: 1700 }, duration: { value: 1200 } },
        { status: "ZERO_RESULTS" }
      ] }] });
  const result = await findMosquesByStation(station("walking-radius"), 1, "nearest");
  assert.deepEqual(result.mosques.map((m) => m.placeId), ["within", "unknown"]);
  assert.equal(result.mosques[0].durationMinutes, 2); assert.equal(result.mosques[0].distanceType, "walking_api");
  assert.equal(result.mosques[1].durationMinutes, undefined); assert.equal(result.mosques[1].distanceType, "haversine_estimate");
});

test("JAKIM uses the requested date and zone, normalizes actual times, and separates daily caches", async () => {
  const requested: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input)); requested.push(url.searchParams.get("date")!);
    return json({ status: "OK!", zone: url.searchParams.get("zone"), prayerTime: [prayerDay(url.searchParams.get("date") === "2026-09-20" ? "20-Sep-2026" : "21-Sep-2026")] });
  };
  const result = await getPrayerTimes("WLY01", "2026-09-20");
  assert.equal(result.timings.Fajr, "05:56"); assert.equal(result.source, "jakim");
  assert.equal(result.date, "2026-09-20"); assert.equal(result.timezone, "Asia/Kuala_Lumpur");
  await getPrayerTimes("WLY01", "2026-09-20"); await getPrayerTimes("WLY01", "2026-09-21");
  assert.deepEqual(requested, ["2026-09-20", "2026-09-21"]);
  assert.equal(malaysiaDate(new Date("2026-09-20T16:01:00Z")), "2026-09-21");
  assert.equal(validPrayerDate("2026-02-30"), false);
});

test("stale JAKIM date, wrong zone and malformed times are rejected", async () => {
  globalThis.fetch = async () => json({ status: "OK!", zone: "SGR01", prayerTime: [prayerDay("19-Sep-2026")] });
  await assert.rejects(getPrayerTimes("SGR01", "2026-09-20"), /DATE_MISMATCH/);
  globalThis.fetch = async () => json({ status: "OK!", zone: "SGR03", prayerTime: [prayerDay("20-Sep-2026")] });
  await assert.rejects(getPrayerTimes("SGR01", "2026-09-20"), /INVALID_RESPONSE/);
  globalThis.fetch = async () => json({ status: "OK!", zone: "SGR01", prayerTime: [{ ...prayerDay("20-Sep-2026"), fajr: "25:00" }] });
  await assert.rejects(getPrayerTimes("SGR01", "2026-09-20"), /INVALID_TIME/);
});

test("API validation rejects invalid radius/sort/coordinates and requires deliberate prayer zone", async () => {
  assert.equal((await mosqueRoute(new NextRequest("http://localhost/api/mosques?stationId=gombak&radius=1.5"))).status, 400);
  assert.equal((await mosqueRoute(new NextRequest("http://localhost/api/mosques?stationId=gombak&sort=random"))).status, 400);
  assert.equal((await prayerRoute(new NextRequest("http://localhost/api/prayer-times?lat=3.1&lng=101.7"))).status, 400);
  assert.equal((await distanceRoute(new NextRequest("http://localhost/api/distance?origin=,&dest=3,101"))).status, 400);
  assert.equal((await embedRoute(new NextRequest("http://localhost/api/map-embed?origin=3,101&destination=91,101"))).status, 400);
});

test("embed never exposes server key and returns a usable keyless preview", async () => {
  withoutKeys(); process.env.GOOGLE_MAPS_API_KEY = "private-server-key";
  const request = new NextRequest("http://localhost/api/map-embed?origin=3.1,101.6&destination=3.2,101.7");
  const fallback = await embedRoute(request);
  assert.match(fallback.headers.get("location")!, /openstreetmap.org/);
  assert.doesNotMatch(fallback.headers.get("location")!, /private-server-key/);
  process.env.GOOGLE_MAPS_EMBED_API_KEY = "public-embed-key";
  const google = await embedRoute(request);
  assert.match(google.headers.get("location")!, /public-embed-key/);
  assert.doesNotMatch(google.headers.get("location")!, /private-server-key/);
});

test("default keyless search uses dated real OSM data without a runtime network dependency", async () => {
  withoutKeys(); delete process.env.OVERPASS_API_URL;
  globalThis.fetch = async () => { throw new Error("Unexpected network request"); };
  const central = await findMosquesByStation(station("snapshot-kl-sentral"), 1, "nearest");
  assert.equal(central.source, "openstreetmap"); assert.equal(central.sourceMode, "snapshot");
  assert.equal(central.sourceUpdatedAt, "2026-07-15T15:22:01Z");
  assert.ok(central.mosques.length > 0);
  for (const mosque of central.mosques) assert.ok(mosque.distanceMeters! <= 1000);
  const airport = { ...station("snapshot-klia"), lat: 2.7545, lng: 101.704 };
  const klia = await findMosquesByStation(airport, 3, "nearest");
  for (const mosque of klia.mosques) assert.ok(mosque.distanceMeters! <= 3000);
  assert.ok(!klia.mosques.some((mosque) => /negara/i.test(mosque.name)), "KLIA must never show unrelated central KL fallback places");
});

test("Google pagination stops after three pages and walking requests batch at 25 destinations", async () => {
  withoutKeys(); process.env.GOOGLE_MAPS_API_KEY = "private-server-key";
  let pages = 0;
  const batchSizes: number[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.includes("nearbysearch")) {
      pages += 1;
      assert.ok(pages <= 3, "pagination must be bounded");
      return json({ status: "OK", next_page_token: `next-${pages}`, results: Array.from({ length: 20 }, (_, index) => ({
        place_id: `page-${pages}-${index}`, name: `Masjid ${pages}-${index}`,
        geometry: { location: { lat: 3.135, lng: 101.6861 } }
      })) });
    }
    const count = url.searchParams.get("destinations")!.split("|").length;
    batchSizes.push(count);
    return json({ status: "OK", rows: [{ elements: Array.from({ length: count }, () => ({
      status: "OK", distance: { value: 100 }, duration: { value: 90 }
    })) }] });
  };
  const result = await findMosquesByStation(station("paged-google"), 1, "nearest");
  assert.equal(pages, 3); assert.equal(result.mosques.length, 60); assert.deepEqual(batchSizes, [25, 25, 10]);
});

test("API selects Google maps for Google walking data even when places come from OSM", async () => {
  withoutKeys();
  process.env.GOOGLE_MAPS_API_KEY = "private-server-key";
  process.env.GOOGLE_MAPS_EMBED_API_KEY = "public-embed-key";
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.includes("nearbysearch")) return json({ status: "REQUEST_DENIED" });
    if (url.pathname.includes("distancematrix")) return json({ status: "OK", rows: [{ elements: [{
      status: "OK", distance: { value: 150 }, duration: { value: 120 }
    }] }] });
    return json({ elements: [{ type: "node", id: 99001, lat: 3.1344, lon: 101.6861, tags: { name: "Mixed provider mosque" } }] });
  };
  const response = await mosqueRoute(new NextRequest("http://localhost/api/mosques?stationId=kl-sentral&radius=1"));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.source, "openstreetmap");
  assert.equal(result.mosques[0].distanceType, "walking_api");
  assert.equal(result.mapProvider, "google");
  assert.equal(result.mapEmbedAvailable, true);
  assert.doesNotMatch(JSON.stringify(result), /private-server-key|public-embed-key/);
});

test("API selects keyless OSM maps for snapshot data without Google-derived distances", async () => {
  withoutKeys(); delete process.env.OVERPASS_API_URL;
  globalThis.fetch = async () => { throw new Error("Unexpected network request"); };
  const response = await mosqueRoute(new NextRequest("http://localhost/api/mosques?stationId=gombak&radius=1"));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.sourceMode, "snapshot");
  assert.equal(result.mapProvider, "openstreetmap");
  assert.equal(result.mapEmbedAvailable, false);
  assert.ok(result.mosques.every((mosque: { distanceType: string }) => mosque.distanceType === "haversine_estimate"));
});
