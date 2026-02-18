"use client";

import { useEffect, useMemo, useState } from "react";
import type { LineType, Station } from "@/lib/types";

type Props = {
  stations: Station[];
  selectedId: string;
  onChange: (stationId: string) => void;
  lineType: "ALL" | LineType;
};

export default function StationPicker({ stations, selectedId, onChange, lineType }: Props) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim().toLowerCase()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    return stations.filter((station) => {
      if (lineType !== "ALL" && station.line_type !== lineType) {
        return false;
      }
      if (!debounced) {
        return true;
      }
      const haystack = `${station.name} ${station.line_name} ${station.line_type}`.toLowerCase();
      return haystack.includes(debounced);
    });
  }, [debounced, stations, lineType]);

  useEffect(() => {
    if (!filtered.some((station) => station.id === selectedId) && filtered[0]) {
      onChange(filtered[0].id);
    }
  }, [filtered, selectedId, onChange]);

  return (
    <div className="space-y-2 rounded-xl border border-brand/15 bg-white p-3 shadow-sm">
      <label className="text-sm font-medium">Pilih stesen</label>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search station"
        className="w-full rounded-lg border border-brand/20 px-3 py-2 text-sm"
      />
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-brand/20 px-3 py-2 text-sm"
      >
        {filtered.map((station) => (
          <option key={station.id} value={station.id}>
            {station.name} ({station.line_type})
          </option>
        ))}
      </select>
      <p className="text-xs text-slate-500">{filtered.length} station(s) dipaparkan</p>
    </div>
  );
}
