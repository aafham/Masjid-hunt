"use client";

import type { Station } from "@/lib/types";

type Props = {
  stations: Station[];
  selectedId: string;
  onChange: (stationId: string) => void;
};

export default function StationPicker({ stations, selectedId, onChange }: Props) {
  return (
    <div className="space-y-2 rounded-xl border border-brand/15 bg-white p-3 shadow-sm">
      <label className="text-sm font-medium">Pilih stesen</label>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        disabled={stations.length === 0}
        className="w-full rounded-lg border border-brand/20 px-3 py-2 text-sm"
      >
        {stations.length === 0 ? <option value="">Tiada stesen sepadan</option> : null}
        {stations.map((station) => (
          <option key={station.id} value={station.id}>
            {station.name} ({station.line_type})
          </option>
        ))}
      </select>
      <p className="text-xs text-slate-500">{stations.length} station(s) dipaparkan</p>
    </div>
  );
}
