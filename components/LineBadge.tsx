import type { Station } from "@/lib/types";
import { lineColor } from "@/lib/presentation";
export default function LineBadge({ station }: { station: Station }) {
  const color = lineColor(station);
  return <span className="line-badge" style={{ color, borderColor: color + "30", backgroundColor: color + "0c" }}><span aria-hidden style={{ background: color }} />{station.station_code || station.line_type} · {station.line_name.replace(/^(LRT|MRT)\s+/, "")}</span>;
}
