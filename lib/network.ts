import shapes from "@/data/transit-shapes.json";
import { getStations, getTransitLines, type TransitLine } from "@/lib/stations";
import type { Station } from "@/lib/types";

export type NetworkLine = TransitLine & {
  stations: Station[];
  path: [number, number][];
  pathSource: "gtfs" | "schematic";
};

const stations = getStations();
const network: NetworkLine[] = getTransitLines().map(line => {
  const members = stations.filter(station => station.line_id === line.id);
  if (line.type === "ERL") {
    // The ERL directory follows the operator's KL Sentral → airport stop order.
    return { ...line, stations: members, path: members.map(station => [station.lat, station.lng]), pathSource: "schematic" };
  }
  const shape = shapes[line.id as keyof typeof shapes];
  const byCode = new Map(members.map(station => [station.station_code, station]));
  const ordered = shape.stopCodes.map(code => {
    const station = byCode.get(code);
    if (!station) throw new Error(`Unknown station code ${line.id}/${code} in GTFS shape`);
    return station;
  });
  return { ...line, stations: ordered, path: shape.path as [number, number][], pathSource: "gtfs" };
});

export function getNetworkLines(): NetworkLine[] {
  return network;
}

// The integrated network also has pedestrian connections between differently
// named stations. Proximity by itself does not establish a passenger transfer.
const connectionNames: Record<string, string> = {
  "Merdeka": "Plaza Rakyat",
  "Muzium Negara": "KL Sentral",
  "Putrajaya & Cyberjaya": "Putrajaya Sentral",
  "Glenmarie 2": "Glenmarie"
};
const connectionGroup = (station: Station) => connectionNames[station.name] ?? station.name;

export function getStationConnections(stationId: string): Station[] {
  const current = stations.find(station => station.id === stationId);
  if (!current) return [];
  return stations.filter(station => station.line_id !== current.line_id && connectionGroup(station) === connectionGroup(current));
}
