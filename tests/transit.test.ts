import assert from "node:assert/strict";
import test from "node:test";
import stations from "../data/stations.my.json";
import metadata from "../data/transit-lines.json";
import aliases from "../data/station-id-aliases.json";
import { getStationById, getStations } from "../lib/stations";
// @ts-expect-error The standalone Node maintenance script intentionally has no runtime TypeScript dependency.
import { buildRapidStations, parseCsv } from "../scripts/sync-transit.mjs";

test("reviewed operating lines have their complete station memberships", () => {
  const counts = { KJ: 37, AG: 18, PH: 29, SA: 20, KGL: 29, PYL: 36, ERL_TRANSIT: 6, ERL_EKSPRES: 3 };
  assert.equal(stations.length, 178);
  assert.equal(new Set(stations.map((station) => station.id)).size, stations.length);
  for (const [lineId, count] of Object.entries(counts)) {
    const entries = stations.filter((station) => station.line_id === lineId);
    assert.equal(entries.length, count, lineId);
    assert.equal(new Set(entries.map((station) => station.station_code)).size, count, lineId);
    assert.equal(metadata.lines.find((line) => line.id === lineId)?.stationCount, count);
  }
});

test("Kajang no longer serves Sungai Buloh or Kampung Selamat; provisional stops are absent", () => {
  for (const name of ["Sungai Buloh", "Kampung Selamat"]) {
    assert.deepEqual(stations.filter((station) => station.name === name).map((station) => station.line_id), ["PYL"]);
  }
  const provisionalCodes = ["PY02", "PY25", "PY26", "PY30", "PY35", "SA4", "SA8", "SA11", "SA13", "SA25"];
  assert.equal(stations.some((station) => provisionalCodes.includes(station.station_code)), false);
  assert.equal(stations.some((station) => station.line_name.includes("MRT3")), false);
  assert.equal(stations.find((station) => station.id === "johan-setia-sa")?.station_code, "SA26");
});

test("interchange lines remain separate and legacy bookmarks resolve correctly", () => {
  const jamek = stations.filter((station) => station.name === "Masjid Jamek");
  assert.deepEqual(new Set(jamek.map((station) => station.line_id)), new Set(["KJ", "AG", "PH"]));
  for (const [oldId, newId] of Object.entries(aliases)) {
    assert.equal(getStationById(oldId)?.id, newId);
  }
  assert.equal(getStationById("sungai-buloh-kajang")?.line_name, "MRT Putrajaya");
  assert.equal(getStationById("seri-serdang")?.name, "Serdang Jaya");
  assert.equal(getStationById("__proto__"), undefined);
  assert.equal(getStationById("unknown-station"), undefined);
  assert.equal(getStations("ERL").length, 9);
});

test("audited coordinate errors do not regress", () => {
  const expected: Record<string, [number, number]> = {
    "gombak": [3.231793, 101.724427],
    "putrajaya-sentral-mrt": [2.9313, 101.6715],
    "kampung-batu-mrt": [3.205521, 101.675473],
    "salak-tinggi": [2.825397, 101.7130747],
    "klia2": [2.7445265, 101.6851796]
  };
  for (const [id, [lat, lng]] of Object.entries(expected)) {
    const station = getStationById(id);
    assert.ok(station, id);
    assert.ok(Math.abs(station.lat - lat) < 0.00001 && Math.abs(station.lng - lng) < 0.00001, id);
  }
  for (const station of stations) {
    assert.ok(station.lat > 2.5 && station.lat < 3.5 && station.lng > 101 && station.lng < 102, station.id);
    assert.ok(station.source);
  }
});

test("GTFS CSV parser handles quoted commas, escaped quotes and Windows newlines", () => {
  assert.deepEqual(parseCsv('\uFEFFstop_id,stop_name\r\nS1,"A, B"\r\nS2,"Dato \\"X\\""\r\n'.replaceAll('\\"', '""')), [
    { stop_id: "S1", stop_name: "A, B" },
    { stop_id: "S2", stop_name: 'Dato "X"' }
  ]);
  assert.throws(() => parseCsv('id,name\n1,"unclosed'), /Unclosed/);
});

test("GTFS membership uses trips rather than misleading stop or stop_time route ids", () => {
  const lines = [{ id: "KGL", name: "MRT Kajang", type: "MRT", stationCount: 1 }];
  const feed = {
    routes: [{ route_id: "KGL", status: "valid" }],
    trips: [{ trip_id: "t1", route_id: "KGL" }],
    stopTimes: [{ trip_id: "t1", route_id: "different-id", stop_id: "KG04", stop_sequence: "1" }],
    stops: [
      { stop_id: "KG04", stop_name: "KWASA DAMANSARA", route_id: "MRT", stop_lat: "3.176146", stop_lon: "101.572052", status: "valid" },
      { stop_id: "KG99", stop_name: "UNSERVED", route_id: "KGL", stop_lat: "3.15", stop_lon: "101.6", status: "valid" }
    ]
  };
  const result = buildRapidStations(feed, lines);
  assert.equal(result.length, 1);
  assert.equal(result[0].station_code, "KG04");
  assert.equal(result[0].line_id, "KGL");
  assert.throws(() => buildRapidStations(feed, [{ ...lines[0], stationCount: 2 }]), /reviewed count/);
});
