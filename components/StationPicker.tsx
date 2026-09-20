"use client";
import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, ChevronRight, TrainFront } from "lucide-react";
import type { LineType, Station } from "@/lib/types";
import { stationSearch } from "@/lib/presentation";
import LineBadge from "@/components/LineBadge";
type Props = { stations: Station[]; onChange: (stationId: string) => void; selectedId?: string };
export default function StationPicker({ stations, onChange }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [line, setLine] = useState("");
  const [category, setCategory] = useState<"ALL" | LineType>("ALL");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const lines = useMemo(() => [...new Set(stations.filter(s => category === "ALL" || s.line_type === category).map(s => s.line_name))], [stations, category]);
  const results = useMemo(() => stations.filter(s => (category === "ALL" || s.line_type === category) && (!line || s.line_name === line) && stationSearch(s, query)).slice(0, 8), [stations, category, line, query]);
  useEffect(() => { if (open && active >= 0) document.getElementById(id + "-option-" + active)?.scrollIntoView({ block: "nearest" }); }, [active, id, open]);
  function choose(stationId: string) { onChange(stationId); setQuery(""); setOpen(false); setActive(-1); }
  return <div className="station-search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <div className="category-tabs" role="group" aria-label="Kategori transit">{(["ALL", "LRT", "MRT", "ERL"] as const).map(type => <button type="button" key={type} aria-pressed={category === type} onClick={() => { setCategory(type); setLine(""); setOpen(true); setActive(-1); }}>{type === "ALL" ? "Semua" : type}</button>)}</div>
    <div className="home-line-select"><label htmlFor={id + "-line"}>Pilih laluan</label><select id={id + "-line"} value={line} onChange={e => { setLine(e.target.value); setActive(-1); setOpen(true); }}><option value="">Semua laluan {category === "ALL" ? "" : category}</option>{lines.map(name => <option key={name}>{name}</option>)}</select></div>
    <div className="search-label-row"><label htmlFor={id}>Anda turun di stesen mana?</label><span>LRT · MRT · ERL</span></div>
    <div className="search-input-wrap"><Search size={20} aria-hidden />
      <input id={id} type="search" value={query} placeholder="Cari nama stesen atau laluan…" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={id + "-results"} aria-activedescendant={open && active >= 0 && results[active] ? id + "-option-" + active : undefined}
        onFocus={() => setOpen(true)} onChange={e => { setQuery(e.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={e => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, results.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
          if (e.key === "Escape") { setOpen(false); setActive(-1); }
          if (e.key === "Enter" && open && results.length) { e.preventDefault(); choose(results[Math.max(active, 0)].id); }
        }} />
      {open ? <button type="button" className="icon-button" aria-label="Tutup cadangan carian" onClick={() => { setOpen(false); setQuery(""); }}><X size={18} /></button> : null}
    </div>
    {open ? <div className="search-dropdown">
      <ul role="listbox" id={id + "-results"} aria-label="Cadangan stesen">
        {results.map((station, index) => <li key={station.id} id={id + "-option-" + index} role="option" aria-selected={active === index} onMouseDown={e => e.preventDefault()} onClick={() => choose(station.id)} className={active === index ? "station-option active" : "station-option"}>
          <TrainFront size={19} aria-hidden /><div><strong>{station.name}</strong><LineBadge station={station} /></div><ChevronRight size={17} aria-hidden />
        </li>)}
      </ul>
      {!results.length ? <div className="search-empty" role="status"><strong>Tiada stesen sepadan.</strong><p>Cuba nama lain atau pilih semua laluan.</p><button type="button" className="text-button" onClick={() => { setQuery(""); setLine(""); setCategory("ALL"); }}>Kosongkan carian</button></div> : null}
      <Link href="/stations" className="search-all">Lihat direktori semua stesen <ChevronRight size={16} aria-hidden /></Link>
    </div> : null}
  </div>;
}
