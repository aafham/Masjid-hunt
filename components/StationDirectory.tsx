"use client";
import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, Search, TrainFront, X } from "lucide-react";
import type { LineType, Station } from "@/lib/types";
import { lineColor, stationSearch } from "@/lib/presentation";
import LineBadge from "@/components/LineBadge";
const TransitNetworkMap = dynamic(() => import("@/components/TransitNetworkMap"), {
  loading: () => <p role="status" className="map-loading">Memuatkan peta rangkaian…</p>
});
export default function StationDirectory({ stations, mode = "list" }: { stations: Station[]; mode?: "list" | "map" }) {
  const [category, setCategory] = useState<"ALL" | LineType>("ALL");
  const [line, setLine] = useState("");
  const mapFilters = useRef<HTMLDetailsElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const availableLines = useMemo(() => [...new Set(stations.filter(item => category === "ALL" || item.line_type === category).map(item => item.line_name))], [stations, category]);
  const filtered = useMemo(() => stations.filter(station => (category === "ALL" || station.line_type === category) && (!line || station.line_name === line) && stationSearch(station, query)), [stations, category, line, query]);
  const groups = useMemo(() => [...new Set(filtered.map(station => station.line_name))].map(name => ({ name, stations: filtered.filter(station => station.line_name === name) })), [filtered]);
  const filters = (
    <section className="directory-filters" aria-label="Tapis stesen mengikut laluan">
      <div className="category-tabs" role="group" aria-label="Kategori transit">{(["ALL", "LRT", "MRT", "ERL"] as const).map(type => <button type="button" key={type} aria-pressed={category === type} onClick={() => { setCategory(type); setLine(""); }}>{type === "ALL" ? "Semua" : type}</button>)}</div>
      <div className="directory-search-row">
        <label htmlFor="directory-line">Pilih laluan
          <select id="directory-line" value={line} onChange={e => setLine(e.target.value)}>
            <option value="">Semua laluan {category === "ALL" ? "" : category}</option>
            {availableLines.map(name => <option key={name}>{name}</option>)}
          </select>
        </label>
        <div>
          <label htmlFor="directory-search">Cari stesen</label>
          <div className="directory-input">
            <Search size={19} aria-hidden />
            <input ref={searchInput} id="directory-search" type="search" placeholder="Nama stesen, kod atau laluan" value={query} onChange={e => setQuery(e.target.value)} />
            {query ? <button type="button" className="icon-button" onClick={() => { setQuery(""); searchInput.current?.focus(); }} aria-label="Kosongkan carian"><X size={16} aria-hidden /></button> : null}
          </div>
        </div>
      </div>
      <p role="status" className="helper">{filtered.length} pilihan stesen · Stesen pertukaran disenaraikan bagi setiap laluan.</p>
    </section>
  );
  return <>
    {mode === "map" ? <details ref={mapFilters} className="network-filters">
      <summary><strong>Tapis peta</strong><span>{[line || (category === "ALL" ? "Semua laluan" : category), query.trim()].filter(Boolean).join(" · ")}</span></summary>
      {filters}
    </details> : filters}
    {!filtered.length ? <div className="empty-state"><Search size={28} aria-hidden /><h2>Tiada stesen sepadan.</h2><p>Cuba ejaan lain atau kosongkan filter laluan.</p><button type="button" className="button-secondary" onClick={() => { setQuery(""); setLine(""); setCategory("ALL"); if (mapFilters.current) mapFilters.current.open = true; searchInput.current?.focus(); }}>Tetapkan semula carian</button></div> : mode === "map" ? <TransitNetworkMap stations={filtered} /> : groups.map(group => <section key={group.name} className="station-group">
      <div className="station-group-heading"><span style={{ backgroundColor: lineColor(group.stations[0]) }} /><h2>{group.name}</h2><small>{group.stations.length} stesen</small>{group.name.includes("Shah Alam") ? <b className="new-badge">BAHARU</b> : null}</div>
      <div className="station-grid">{group.stations.map(station => <Link key={station.id} href={"/station/" + station.id} className="station-card"><TrainFront size={22} aria-hidden /><div><h3>{station.name}</h3><LineBadge station={station} /></div><ArrowUpRight size={18} aria-hidden /></Link>)}</div>
    </section>)}
  </>;
}
