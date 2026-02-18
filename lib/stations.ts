import stationData from "@/data/stations.my.json";
import type { LineType, Station } from "@/lib/types";

const stations = stationData as Station[];

export function getStations(lineType?: "ALL" | LineType): Station[] {
  if (!lineType || lineType === "ALL") {
    return stations;
  }
  return stations.filter((station) => station.line_type === lineType);
}

export function getStationById(id: string): Station | undefined {
  return stations.find((station) => station.id === id);
}
