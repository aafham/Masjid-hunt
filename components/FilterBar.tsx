"use client";
import { SlidersHorizontal } from "lucide-react";
import type { SortOrder } from "@/lib/types";
type Props = { radiusKm: number; onRadiusChange: (value: number) => void; sort: SortOrder; onSortChange: (value: SortOrder) => void; mosqueQuery: string; onQueryChange: (value: string) => void };
export default function FilterBar({ radiusKm, onRadiusChange, sort, onSortChange, mosqueQuery, onQueryChange }: Props) {
  return <div className="filters">
    <fieldset className="radius-filter"><legend>Jarak maksimum</legend><div className="radius-options">{[1, 2, 3].map(radius => <button type="button" key={radius} aria-pressed={radiusKm === radius} onClick={() => onRadiusChange(radius)}>{radius} km</button>)}</div></fieldset>
    <details className="extra-filters"><summary><SlidersHorizontal size={17} aria-hidden /> Tapis hasil</summary><div className="extra-filter-fields"><label htmlFor="mosque-query">Nama masjid dalam hasil ini<input id="mosque-query" type="search" placeholder="Cari masjid atau surau" value={mosqueQuery} onChange={e => onQueryChange(e.target.value)} /></label><label htmlFor="sort-results">Susun mengikut<select id="sort-results" value={sort} onChange={e => onSortChange(e.target.value as SortOrder)}><option value="nearest">Terdekat dahulu</option><option value="farthest">Terjauh dahulu</option></select></label></div></details>
  </div>;
}
