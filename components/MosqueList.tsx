"use client";

import type { Mosque, Station } from "@/lib/types";
import MosqueCard from "@/components/MosqueCard";

type Props = {
  mosques: Mosque[];
  station: Station;
  loading: boolean;
  error: string | null;
  total: number;
  source?: "google" | "fallback";
};

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="animate-pulse rounded-xl border border-brand/10 bg-white p-4">
          <div className="mb-2 h-4 w-3/4 rounded bg-slate-200" />
          <div className="mb-2 h-3 w-1/2 rounded bg-slate-200" />
          <div className="h-3 w-full rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

export default function MosqueList({ mosques, station, loading, error, total, source }: Props) {
  if (loading) {
    return <Skeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (mosques.length === 0) {
    return (
      <div className="rounded-xl border border-brand/20 bg-white p-4 text-sm text-slate-600">
        Tiada masjid ditemui untuk radius ini.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <p className="text-sm text-slate-600">
        {total} result untuk {station.name}
        {source === "fallback" ? " (fallback demo digunakan)" : ""}
      </p>
      {mosques.map((mosque) => (
        <MosqueCard key={mosque.placeId} mosque={mosque} station={station} />
      ))}
    </section>
  );
}
