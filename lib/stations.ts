import stationData from "@/data/stations.my.json";
import metadata from "@/data/transit-lines.json";
import aliases from "@/data/station-id-aliases.json";
import type { LineType, Station } from "@/lib/types";

const stations = stationData as Station[];

export type TransitLine = {
  id: string;
  name: string;
  type: LineType;
  color: string;
  status: "operational";
  stationCount: number;
  sourceUrl: string;
  openingDate?: string;
};

export const transitMetadata = metadata;

export function getTransitLines(): TransitLine[] {
  return metadata.lines as TransitLine[];
}

export function getStations(lineType?: "ALL" | LineType): Station[] {
  if (!lineType || lineType === "ALL") {
    return stations;
  }
  return stations.filter((station) => station.line_type === lineType);
}

export function getStationById(id: string): Station | undefined {
  const canonicalId = Object.prototype.hasOwnProperty.call(aliases, id)
    ? aliases[id as keyof typeof aliases]
    : id;
  return stations.find((station) => station.id === canonicalId);
}
