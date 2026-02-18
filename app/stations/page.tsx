"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LineType } from "@/lib/types";
import stationsData from "@/data/stations.my.json";

export default function StationsPage() {
  const stations = stationsData;
  const [lineType, setLineType] = useState<"ALL" | LineType>("ALL");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim().toLowerCase()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    return stations.filter((station) => {
      if (lineType !== "ALL" && station.line_type !== lineType) {
        return false;
      }
      if (!debounced) {
        return true;
      }
      return `${station.name} ${station.line_name}`.toLowerCase().includes(debounced);
    });
  }, [stations, lineType, debounced]);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Browse All Stations</h2>
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-brand/15 bg-white p-3 shadow-sm sm:grid-cols-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari station"
          className="rounded-lg border border-brand/20 px-3 py-2 text-sm"
        />
        <select
          value={lineType}
          onChange={(e) => setLineType(e.target.value as "ALL" | LineType)}
          className="rounded-lg border border-brand/20 px-3 py-2 text-sm"
        >
          <option value="ALL">All</option>
          <option value="LRT">LRT</option>
          <option value="MRT">MRT</option>
          <option value="ERL">ERL</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((station) => (
          <Link
            key={station.id}
            href={`/station/${station.id}`}
            className="rounded-xl border border-brand/15 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
          >
            <h3 className="font-semibold text-ink">{station.name}</h3>
            <p className="text-sm text-slate-600">
              {station.line_type} | {station.line_name}
            </p>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-brand/15 bg-white p-4 text-sm text-slate-600">
          Tiada station sepadan.
        </p>
      ) : null}
    </section>
  );
}
