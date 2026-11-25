import { ArrowUpRight } from "lucide-react";
import type { Mosque, Station } from "@/lib/types";
export default function GoogleMapPreview({ station, mosque, embedAvailable }: { station: Station; mosque?: Mosque; embedAvailable: boolean }) {
  if (!mosque) {
    const query = new URLSearchParams({ api: "1", query: station.lat + "," + station.lng });
    return <div className="map-fallback">
      <p>Tiada destinasi dalam hasil carian ini.</p>
      <a className="button-secondary" href={"https://www.google.com/maps/search/?" + query} target="_blank" rel="noreferrer">
        Lihat stesen di Google Maps <ArrowUpRight size={16} aria-hidden />
      </a>
    </div>;
  }
  const params = new URLSearchParams({ origin: station.lat + "," + station.lng, destination: mosque.lat + "," + mosque.lng });
  const direction = new URLSearchParams({ api: "1", origin: station.lat + "," + station.lng, destination: mosque.lat + "," + mosque.lng, travelmode: "walking" });
  if (!embedAvailable) return <div className="map-fallback"><p>Lokasi dan laluan tersedia di Google Maps.</p><a className="button-secondary" href={"https://www.google.com/maps/dir/?" + direction} target="_blank" rel="noreferrer">Buka Google Maps <ArrowUpRight size={16} aria-hidden /></a></div>;
  return <iframe className="map-canvas" title={"Laluan Google dari " + station.name + " ke " + mosque.name} src={"/api/map-embed?" + params} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />;
}
