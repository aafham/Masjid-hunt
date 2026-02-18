"use client";

import { useEffect, useMemo, useState } from "react";
import type { LineType, Mosque, SortOrder, Station } from "@/lib/types";
import FilterBar from "@/components/FilterBar";
import StationPicker from "@/components/StationPicker";
import MosqueList from "@/components/MosqueList";

type ApiResponse = {
  station: Station;
  radiusKm: number;
  total: number;
  source: "google" | "fallback";
  mosques: Mosque[];
  error?: string;
};

type Props = {
  stations: Station[];
  initialStationId?: string;
  lockStation?: boolean;
};

export default function ResultsExplorer({ stations, initialStationId, lockStation = false }: Props) {
  const [radiusKm, setRadiusKm] = useState(2);
  const [lineType, setLineType] = useState<"ALL" | LineType>("ALL");
  const [sort, setSort] = useState<SortOrder>("nearest");
  const [selectedStationId, setSelectedStationId] = useState(initialStationId || stations[0]?.id || "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState<"google" | "fallback" | undefined>(undefined);

  const selectedStation = useMemo(
    () => stations.find((station) => station.id === selectedStationId) || stations[0],
    [stations, selectedStationId]
  );

  useEffect(() => {
    if (!selectedStationId) {
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          stationId: selectedStationId,
          radius: String(radiusKm),
          sort
        });

        const res = await fetch(`/api/mosques?${params.toString()}`);
        const data = (await res.json()) as ApiResponse;

        if (!res.ok) {
          throw new Error(data.error || "Ralat API");
        }

        if (active) {
          setMosques(data.mosques);
          setTotal(data.total);
          setSource(data.source);
        }
      } catch (e) {
        if (active) {
          setError(
            e instanceof Error
              ? e.message
              : "Tidak dapat mendapatkan data masjid. Sila cuba lagi."
          );
          setMosques([]);
          setTotal(0);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [selectedStationId, radiusKm, sort]);

  if (!selectedStation) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Tiada station tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
        radiusKm={radiusKm}
        onRadiusChange={setRadiusKm}
        lineType={lineType}
        onLineTypeChange={setLineType}
        sort={sort}
        onSortChange={setSort}
      />

      {!lockStation ? (
        <StationPicker
          stations={stations}
          selectedId={selectedStationId}
          onChange={setSelectedStationId}
          lineType={lineType}
        />
      ) : (
        <div className="rounded-xl border border-brand/15 bg-white p-3 text-sm text-slate-700">
          Stesen: <span className="font-semibold">{selectedStation.name}</span> ({selectedStation.line_type})
        </div>
      )}

      <MosqueList
        mosques={mosques}
        station={selectedStation}
        loading={loading}
        error={error}
        total={total}
        source={source}
      />
    </div>
  );
}
