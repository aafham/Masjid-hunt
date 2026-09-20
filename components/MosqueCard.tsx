"use client";
import { ArrowUpRight, Footprints, MapPin } from "lucide-react";
import type { Mosque, Station } from "@/lib/types";
import { formatDistance } from "@/lib/utils";
type Props = { mosque: Mosque; station: Station; index: number; selected: boolean; onSelect: () => void };
export default function MosqueCard({ mosque, station, index, selected, onSelect }: Props) {
  const params = new URLSearchParams({ api: "1", origin: station.lat + "," + station.lng, destination: mosque.lat + "," + mosque.lng, travelmode: "walking" });
  const estimated = mosque.distanceType !== "walking_api";
  return <article id={"mosque-" + index} className={"mosque-card" + (selected ? " selected" : "")}>
    <div className="mosque-card-heading"><span className="result-number">{String(index + 1).padStart(2, "0")}</span><div><h3>{mosque.name}</h3><p className="mosque-address"><MapPin size={14} aria-hidden />{mosque.address || "Alamat belum tersedia; semak pin lokasi."}</p></div></div>
    <div className="distance-row"><Footprints size={17} aria-hidden /><strong>{formatDistance(mosque.distanceMeters)}</strong><span>{estimated ? "anggaran garis lurus" : mosque.durationMinutes ? mosque.durationMinutes + " min berjalan" : "laluan berjalan"}</span></div>
    <div className="card-actions"><a href={"https://www.google.com/maps/dir/?" + params} target="_blank" rel="noreferrer" className="button-primary" aria-label={"Laluan berjalan dari " + station.name + " ke " + mosque.name}>Laluan berjalan <ArrowUpRight size={16} aria-hidden /></a><button type="button" className="map-select-button" aria-pressed={selected} onClick={onSelect}>Lihat di peta</button></div>
  </article>;
}
