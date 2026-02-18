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
  const [searchScope, setSearchScope] = useState<"station" | "masjid">("station");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState<"google" | "fallback" | undefined>(undefined);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 250);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      if (lineType !== "ALL" && station.line_type !== lineType) {
        return false;
      }
      if (searchScope !== "station" || !debouncedSearch) {
        return true;
      }
      const haystack = `${station.name} ${station.line_name} ${station.line_type}`.toLowerCase();
      return haystack.includes(debouncedSearch);
    });
  }, [stations, lineType, searchScope, debouncedSearch]);

  useEffect(() => {
    if (filteredStations.some((station) => station.id === selectedStationId) || !filteredStations[0]) {
      return;
    }
    setSelectedStationId(filteredStations[0].id);
  }, [filteredStations, selectedStationId]);

  const selectedStation = useMemo(
    () => stations.find((station) => station.id === selectedStationId) || stations[0],
    [stations, selectedStationId]
  );

  const displayedMosques = useMemo(() => {
    if (searchScope !== "masjid" || !debouncedSearch) {
      return mosques;
    }
    return mosques.filter((mosque) => mosque.name.toLowerCase().includes(debouncedSearch));
  }, [mosques, searchScope, debouncedSearch]);

  const displayedTotal = searchScope === "masjid" && debouncedSearch ? displayedMosques.length : total;

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

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-brand/15 bg-white p-3 shadow-sm sm:grid-cols-[1fr_160px]">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={searchScope === "station" ? "Cari station" : "Cari masjid atau surau"}
          className="w-full rounded-lg border border-brand/20 px-3 py-2 text-sm"
        />
        <select
          value={searchScope}
          onChange={(e) => setSearchScope(e.target.value as "station" | "masjid")}
          className="w-full rounded-lg border border-brand/20 px-3 py-2 text-sm"
        >
          <option value="station">Station</option>
          <option value="masjid">Masjid</option>
        </select>
      </div>

      {!lockStation ? (
        <StationPicker
          stations={filteredStations}
          selectedId={selectedStationId}
          onChange={setSelectedStationId}
        />
      ) : (
        <div className="rounded-xl border border-brand/15 bg-white p-3 text-sm text-slate-700">
          Stesen: <span className="font-semibold">{selectedStation.name}</span> ({selectedStation.line_type})
        </div>
      )}

      <MosqueList
        mosques={displayedMosques}
        station={selectedStation}
        loading={loading}
        error={error}
        total={displayedTotal}
        source={source}
      />
    </div>
  );
}
