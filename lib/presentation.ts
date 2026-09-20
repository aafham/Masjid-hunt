import type { Station } from "@/lib/types";
export function lineColor(station: Pick<Station, "line_name">): string {
  const line = station.line_name.toLowerCase();
  if (line.includes("shah alam")) return "#147a9b";
  if (line.includes("kelana")) return "#b83259";
  if (line.includes("kajang")) return "#167143";
  if (line.includes("putrajaya") && !line.includes("erl")) return "#847019";
  if (line.includes("sri petaling")) return "#76232f";
  if (line.includes("ampang")) return "#8b5b0d";
  if (line.includes("klia transit")) return "#006e78";
  return "#714793";
}
export function stationSearch(station: Station, query: string): boolean {
  const normalize = (value: string) => value.toLocaleLowerCase("ms").normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return normalize(station.name + " " + station.line_name + " " + (station.station_code ?? "") + " " + station.id).includes(normalize(query));
}
