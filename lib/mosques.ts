import fallbackMosques from "@/data/fallback-mosques.json";
import type { Mosque, Station } from "@/lib/types";
import { haversineMeters } from "@/lib/utils";

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_RESULTS = 40;

type CachedEntry = {
  expiresAt: number;
  payload: Mosque[];
  source: "google" | "fallback";
};

const mosquesCache = new Map<string, CachedEntry>();

type GooglePlaceResult = {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
};

export async function findMosquesByStation(
  station: Station,
  radiusKm: number,
  sortBy: "nearest" | "farthest"
): Promise<{ mosques: Mosque[]; source: "google" | "fallback" }> {
  const cacheKey = `${station.id}:${radiusKm}:${sortBy}`;
  const cached = mosquesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { mosques: cached.payload, source: cached.source };
  }

  const placeKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  let mosques: Mosque[];
  let source: "google" | "fallback" = "google";

  if (!placeKey) {
    mosques = createFallback(station);
    source = "fallback";
  } else {
    try {
      const places = await searchNearbyMosques(
        station.lat,
        station.lng,
        Math.round(radiusKm * 1000),
        placeKey
      );

      mosques = places.slice(0, MAX_RESULTS).map((place) => ({
        placeId: place.place_id,
        name: place.name,
        lat: place.geometry?.location?.lat ?? 0,
        lng: place.geometry?.location?.lng ?? 0,
        address: place.vicinity || place.formatted_address,
        distanceType: "haversine_estimate"
      }));

      mosques = mosques.filter((m) => m.lat && m.lng);

      if (mosques.length === 0) {
        mosques = createFallback(station);
        source = "fallback";
      }
    } catch {
      mosques = createFallback(station);
      source = "fallback";
    }
  }

  const withDistance = await enrichDistance(station, mosques);
  const sorted = withDistance.sort((a, b) => {
    const d1 = a.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    const d2 = b.distanceMeters ?? Number.MAX_SAFE_INTEGER;
    return sortBy === "nearest" ? d1 - d2 : d2 - d1;
  });

  mosquesCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    payload: sorted,
    source
  });

  return { mosques: sorted, source };
}

async function searchNearbyMosques(
  lat: number,
  lng: number,
  radiusMeters: number,
  key: string
): Promise<GooglePlaceResult[]> {
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(radiusMeters),
    type: "mosque",
    key
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) {
    throw new Error("Places API request failed");
  }

  const data = (await res.json()) as { status: string; results?: GooglePlaceResult[] };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places API status ${data.status}`);
  }

  return data.results ?? [];
}

async function enrichDistance(station: Station, mosques: Mosque[]): Promise<Mosque[]> {
  if (mosques.length === 0) {
    return [];
  }

  const matrixKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!matrixKey) {
    return mosques.map((mosque) => {
      const meters = haversineMeters(station.lat, station.lng, mosque.lat, mosque.lng);
      return {
        ...mosque,
        distanceMeters: meters,
        durationMinutes: Math.max(1, Math.round(meters / 80)),
        distanceType: "haversine_estimate"
      };
    });
  }

  const destinations = mosques.map((mosque) => `${mosque.lat},${mosque.lng}`).join("|");

  const params = new URLSearchParams({
    origins: `${station.lat},${station.lng}`,
    destinations,
    mode: "walking",
    key: matrixKey
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      throw new Error("Distance Matrix request failed");
    }

    const json = (await response.json()) as {
      rows?: Array<{
        elements?: Array<{
          status?: string;
          distance?: { value?: number };
          duration?: { value?: number };
        }>;
      }>;
    };

    const elements = json.rows?.[0]?.elements ?? [];

    return mosques.map((mosque, index) => {
      const element = elements[index];
      if (!element || element.status !== "OK") {
        const meters = haversineMeters(station.lat, station.lng, mosque.lat, mosque.lng);
        return {
          ...mosque,
          distanceMeters: meters,
          durationMinutes: Math.max(1, Math.round(meters / 80)),
          distanceType: "haversine_estimate"
        };
      }

      const distanceMeters = element.distance?.value;
      const durationMinutes = element.duration?.value
        ? Math.max(1, Math.round(element.duration.value / 60))
        : undefined;

      return {
        ...mosque,
        distanceMeters,
        durationMinutes,
        distanceType: "walking_api"
      };
    });
  } catch {
    return mosques.map((mosque) => {
      const meters = haversineMeters(station.lat, station.lng, mosque.lat, mosque.lng);
      return {
        ...mosque,
        distanceMeters: meters,
        durationMinutes: Math.max(1, Math.round(meters / 80)),
        distanceType: "haversine_estimate"
      };
    });
  }
}

function createFallback(station: Station): Mosque[] {
  const fallbackByStation = fallbackMosques as Record<
    string,
    Array<Pick<Mosque, "placeId" | "name" | "lat" | "lng" | "address">>
  >;

  const list = fallbackByStation[station.id] ?? fallbackByStation["kl-sentral"] ?? [];

  return list.map((item) => ({
    ...item,
    distanceType: "haversine_estimate"
  }));
}
