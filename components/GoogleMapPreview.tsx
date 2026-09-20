import { ArrowUpRight } from "lucide-react";
import type { Mosque, Station } from "@/lib/types";
export default function GoogleMapPreview({ station, mosque, embedAvailable }: { station: Station; mosque?: Mosque; embedAvailable: boolean }) {
  const point = mosque || station;
  const params = new URLSearchParams({ origin: station.lat + "," + station.lng, destination: point.lat + "," + point.lng });
  const direction = new URLSearchParams({ api: "1", origin: station.lat + "," + station.lng, destination: point.lat + "," + point.lng, travelmode: "walking" });
  if (!embedAvailable) return <div className="map-fallback"><p>Lokasi dan laluan tersedia di Google Maps.</p><a className="button-secondary" href={"https://www.google.com/maps/dir/?" + direction} target="_blank" rel="noreferrer">Buka Google Maps <ArrowUpRight size={16} aria-hidden /></a></div>;
  return <iframe className="map-canvas" title={mosque ? "Laluan Google dari " + station.name + " ke " + mosque.name : "Peta Google stesen " + station.name} src={"/api/map-embed?" + params} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />;
}
