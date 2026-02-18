"use client";

import { useEffect, useMemo, useState } from "react";
import stationData from "@/data/stations.my.json";
import type { LineType, Station } from "@/lib/types";
import { haversineMeters } from "@/lib/utils";

type PrayerApiResponse = {
  area: string;
  timings: Record<string, string>;
  source: "aladhan";
  error?: string;
};

type NearStation = {
  station: Station;
  distanceMeters: number;
};

type UserLocation = {
  lat: number;
  lng: number;
};

type NearbyAnyStation = {
  station: Station;
  distanceMeters: number;
};

const stations = stationData as Station[];

export default function LocationPrayerPanel() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [prayerArea, setPrayerArea] = useState<string | null>(null);
  const [prayerTimings, setPrayerTimings] = useState<Record<string, string> | null>(null);
  const [prayerError, setPrayerError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Browser tidak menyokong geolokasi.");
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingLocation(false);
      },
      () => {
        setLocationError("Lokasi tidak dibenarkan. Aktifkan location permission.");
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (!location) {
      return;
    }

    const loadPrayerTimes = async () => {
      setPrayerError(null);
      try {
        const params = new URLSearchParams({
          lat: String(location.lat),
          lng: String(location.lng)
        });
        const res = await fetch(`/api/prayer-times?${params.toString()}`);
        const data = (await res.json()) as PrayerApiResponse;
        if (!res.ok) {
          throw new Error(data.error || "Gagal ambil waktu solat.");
        }
        setPrayerArea(data.area);
        setPrayerTimings(data.timings);
      } catch (error) {
        setPrayerError(error instanceof Error ? error.message : "Ralat waktu solat.");
      }
    };

    loadPrayerTimes();
  }, [location]);

  const nearest = useMemo(() => {
    if (!location) {
      return null;
    }

    const nearestByType = (lineType: LineType): NearStation | null => {
      let best: NearStation | null = null;
      for (const station of stations) {
        if (station.line_type !== lineType) {
          continue;
        }
        const distanceMeters = haversineMeters(location.lat, location.lng, station.lat, station.lng);
        if (!best || distanceMeters < best.distanceMeters) {
          best = { station, distanceMeters };
        }
      }
      return best;
    };

    const lrt = nearestByType("LRT");
    const mrt = nearestByType("MRT");
    const erl = nearestByType("ERL");

    const candidates = [lrt, mrt, erl].filter(Boolean) as NearStation[];
    const overall =
      candidates.length > 0
        ? candidates.reduce((best, cur) =>
            cur.distanceMeters < best.distanceMeters ? cur : best
          )
        : null;

    return { lrt, mrt, erl, overall };
  }, [location]);

  const nearestAllStations = useMemo(() => {
    if (!location) {
      return [];
    }

    const ranked: NearbyAnyStation[] = stations.map((station) => ({
      station,
      distanceMeters: haversineMeters(location.lat, location.lng, station.lat, station.lng)
    }));

    ranked.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return ranked.slice(0, 12);
  }, [location]);

  return (
    <section className="mx-auto mt-4 w-full max-w-5xl px-4">
      <div className="rounded-xl border border-brand/20 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-ink">Waktu Solat & Stesen Terdekat</h2>
        <p className="mt-1 text-xs text-slate-600">
          Auto-detect lokasi anda. Waktu solat dipaparkan untuk kawasan Kuala Lumpur/Selangor.
        </p>

        {loadingLocation ? (
          <p className="mt-3 text-sm text-slate-600">Mengesan lokasi semasa...</p>
        ) : null}

        {locationError ? (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{locationError}</p>
        ) : null}

        {!loadingLocation && !locationError ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-lg bg-accent p-3">
              <p className="text-sm font-semibold text-ink">
                Kawasan dikesan: {prayerArea ?? "Mengesan..."}
              </p>
              {nearest?.overall ? (
                <p className="mt-1 text-xs text-slate-700">
                  Stesen paling dekat sekarang: {nearest.overall.station.name} (
                  {nearest.overall.station.line_type}) - {formatDistance(nearest.overall.distanceMeters)}
                </p>
              ) : null}
              {prayerError ? (
                <p className="mt-2 text-sm text-red-700">{prayerError}</p>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                  <TimeBox label="Subuh" value={prayerTimings?.Fajr} />
                  <TimeBox label="Zohor" value={prayerTimings?.Dhuhr} />
                  <TimeBox label="Asar" value={prayerTimings?.Asr} />
                  <TimeBox label="Maghrib" value={prayerTimings?.Maghrib} />
                  <TimeBox label="Isyak" value={prayerTimings?.Isha} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <DistanceBox title="LRT terdekat" nearStation={nearest?.lrt ?? null} />
              <DistanceBox title="MRT terdekat" nearStation={nearest?.mrt ?? null} />
              <DistanceBox title="ERL terdekat" nearStation={nearest?.erl ?? null} />
            </div>

            <div className="rounded-lg border border-brand/15 bg-white p-3">
              <p className="text-sm font-semibold text-ink">
                Semua stesen terdekat (LRT + MRT + ERL)
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Senarai ini berdasarkan jarak dari lokasi semasa, tidak bergantung pada data masjid/surau.
              </p>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {nearestAllStations.map((item) => (
                  <div
                    key={`${item.station.id}-nearby`}
                    className="rounded-md border border-brand/10 bg-slate-50 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-ink">{item.station.name}</p>
                    <p className="text-xs text-slate-600">
                      {item.station.line_type} | {item.station.line_name}
                    </p>
                    <p className="text-xs text-brandDark">
                      {formatDistance(item.distanceMeters)} dari lokasi semasa
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TimeBox({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border border-brand/15 bg-white px-2 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-ink">{value ?? "--:--"}</p>
    </div>
  );
}

function DistanceBox({
  title,
  nearStation
}: {
  title: string;
  nearStation: NearStation | null;
}) {
  if (!nearStation) {
    return (
      <div className="rounded-lg border border-brand/15 bg-slate-50 p-3 text-sm text-slate-600">
        {title}: tiada data
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-brand/15 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-sm font-semibold text-ink">{nearStation.station.name}</p>
      <p className="text-xs text-slate-600">
        {formatDistance(nearStation.distanceMeters)} dari lokasi semasa
      </p>
    </div>
  );
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
