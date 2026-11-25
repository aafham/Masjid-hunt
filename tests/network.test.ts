import assert from "node:assert/strict";
import test from "node:test";
import { getNetworkLines, getStationConnections } from "../lib/network";
import { getStations } from "../lib/stations";
import { haversineMeters } from "../lib/utils";

test("the network includes each operating line membership once and follows served termini", () => {
  const lines = getNetworkLines();
  assert.equal(lines.length, 8);
  const entries = lines.flatMap(line => line.stations.map(station => station.id)).sort();
  assert.deepEqual(entries, getStations().map(station => station.id).sort());
  for (const line of lines) {
    assert.equal(line.stations.length, line.stationCount);
    assert.ok(line.stations.every(station => station.line_id === line.id));
    if (line.type === "ERL") {
      assert.equal(line.pathSource, "schematic");
      assert.deepEqual(line.path, line.stations.map(station => [station.lat, station.lng]));
      assert.equal(line.stations[0].name, "KL Sentral");
      assert.equal(line.stations.at(-1)?.name, "KLIA Terminal 2");
    } else {
      assert.equal(line.pathSource, "gtfs");
      assert.ok(line.path.length > line.stations.length);
      const first = line.stations[0], last = line.stations.at(-1)!;
      assert.ok(haversineMeters(first.lat, first.lng, ...line.path[0]) < 200, line.name);
      assert.ok(haversineMeters(last.lat, last.lng, ...line.path.at(-1)!) < 200, line.name);
    }
  }
  const kajang = lines.find(line => line.id === "KGL")!;
  assert.equal(kajang.stations[0].name, "Kwasa Damansara");
  assert.equal(kajang.stations.at(-1)?.name, "Kajang");
});

test("connections include supported services at interchanges and documented walking links", () => {
  const connections = (id: string) => getStationConnections(id).map(station => station.line_id).sort();
  assert.deepEqual(connections("masjid-jamek"), ["AG", "PH"]);
  assert.deepEqual(connections("merdeka"), ["AG", "PH"]);
  assert.deepEqual(connections("putrajaya-sentral-mrt"), ["ERL_TRANSIT"]);
  assert.deepEqual(connections("glenmarie-2-sa"), ["KJ"]);
  assert.deepEqual(connections("salak-tinggi"), []);
  assert.deepEqual(connections("unknown"), []);
  for (const station of getStations()) {
    for (const other of getStationConnections(station.id)) {
      assert.ok(getStationConnections(other.id).some(entry => entry.id === station.id));
    }
  }
});
