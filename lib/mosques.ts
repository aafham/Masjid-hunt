import { validCoordinates } from "@/lib/coordinates";
import { ExpiringCache } from "@/lib/server-cache";
import type { Mosque, Station } from "@/lib/types";
import { fetchJson, UpstreamError } from "@/lib/upstream";
import { haversineMeters } from "@/lib/utils";
import osmSnapshot from "@/data/mosques.osm.json";

const MAX_RESULTS = 60;
const CACHE_TTL_MS = 10 * 60 * 1000;
const mosquesCache = new ExpiringCache<MosqueSearchResult>(300, CACHE_TTL_MS);
const inFlight = new Map<string, Promise<MosqueSearchResult>>();

export type MosqueSearchResult = {
  mosques: Mosque[];
  source: "google" | "openstreetmap";
  attribution: { label: string; url: string };
  warning?: string;
  sourceMode?: "snapshot" | "live";
  sourceUpdatedAt?: string;
  snapshotRetrievedAt?: string;
};

type GooglePlace = {
  place_id?: string;
  name?: string;
  vicinity?: string;
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
};

type OverpassElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

function reportUpstream(error: unknown) {
  // Log only a safe provider/status pair; credentials and raw URLs stay private.
  console.warn("[mosques] upstream unavailable", error instanceof UpstreamError ? error.message : "UNKNOWN_PROVIDER_ERROR");
}

export async function findMosquesByStation(
  station: Station,
  radiusKm: number,
  sortBy: "nearest" | "farthest"
): Promise<MosqueSearchResult> {
  if (![1, 2, 3].includes(radiusKm) || !validCoordinates(station.lat, station.lng)) {
    throw new Error("Stesen atau radius tidak sah");
  }
  // Sorting never makes a second upstream request; coordinates invalidate moved stops.
  const cacheKey = `${station.id}:${station.lat}:${station.lng}:${radiusKm}`;
  let result = mosquesCache.get(cacheKey);
  if (!result) {
    let pending = inFlight.get(cacheKey);
    if (!pending) {
      if (inFlight.size >= 20) throw new UpstreamError("mosques", "BUSY");
      pending = loadMosques(station, radiusKm).then((value) => {
        mosquesCache.set(cacheKey, value);
        return value;
      });
      inFlight.set(cacheKey, pending);
      void pending.finally(() => inFlight.delete(cacheKey)).catch(() => undefined);
    }
    result = await pending;
  }
  return {
    ...result,
    mosques: [...result.mosques].sort((a, b) => {
      const difference = (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
      return sortBy === "nearest" ? difference : -difference;
    })
  };
}

async function loadMosques(station: Station, radiusKm: number): Promise<MosqueSearchResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  let mosques: Mosque[];
  let source: MosqueSearchResult["source"] = "openstreetmap";
  let warning: string | undefined;
  let osmMetadata: Pick<MosqueSearchResult, "sourceMode" | "sourceUpdatedAt" | "snapshotRetrievedAt"> = {};
  const loadOsm = async () => {
    if (process.env.OVERPASS_API_URL) {
      try {
        const live = await searchOpenStreetMap(station, radiusKm * 1000);
        osmMetadata = { sourceMode: "live", sourceUpdatedAt: live.updatedAt };
        return live.mosques;
      } catch (error) {
        reportUpstream(error);
        warning = "Kemas kini peta langsung tidak tersedia. Hasil menggunakan salinan data OpenStreetMap bertarikh.";
      }
    }
    const [south, west, north, east] = osmSnapshot.bounds;
    if (station.lat < south || station.lat > north || station.lng < west || station.lng > east) {
      throw new UpstreamError("openstreetmap", "OUTSIDE_SNAPSHOT_COVERAGE");
    }
    osmMetadata = {
      sourceMode: "snapshot",
      sourceUpdatedAt: osmSnapshot.dataUpdatedAt,
      snapshotRetrievedAt: osmSnapshot.retrievedAt
    };
    return osmSnapshot.mosques.map((mosque): Mosque => ({
      ...mosque, source: "openstreetmap", distanceType: "haversine_estimate"
    }));
  };
  if (key) {
    try {
      mosques = await searchGoogle(station, radiusKm * 1000, key);
      source = "google";
    } catch (error) {
      reportUpstream(error);
      warning = "Carian Google tidak tersedia. Hasil menggunakan OpenStreetMap.";
      mosques = await loadOsm();
    }
  } else {
    mosques = await loadOsm();
  }
  // A successful ZERO_RESULTS stays empty. No demo or unrelated station data.
  const seen = new Set<string>();
  const candidates = mosques.filter((mosque) => {
    if (seen.has(mosque.placeId)) return false;
    seen.add(mosque.placeId);
    return validCoordinates(mosque.lat, mosque.lng) &&
      haversineMeters(station.lat, station.lng, mosque.lat, mosque.lng) <= radiusKm * 1000;
  }).map((mosque) => ({
    ...mosque,
    distanceMeters: haversineMeters(station.lat, station.lng, mosque.lat, mosque.lng)
  })).sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, MAX_RESULTS);
  const measured = await enrichDistance(station, candidates);
  return {
    source,
    warning,
    ...osmMetadata,
    attribution: source === "google"
      ? { label: "Google Maps", url: "https://maps.google.com" }
      : { label: "© OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright" },
    mosques: measured.filter((mosque) => Number.isFinite(mosque.distanceMeters) && (mosque.distanceMeters as number) <= radiusKm * 1000)
  };
}

async function searchGoogle(station: Station, radiusMeters: number, key: string): Promise<Mosque[]> {
  const results: GooglePlace[] = [];
  let token: string | undefined;
  for (let page = 0; page < 3; page += 1) {
    const params = token
      ? new URLSearchParams({ pagetoken: token, key })
      : new URLSearchParams({ location: `${station.lat},${station.lng}`, radius: String(radiusMeters), type: "mosque", key });
    // Google's pagination tokens need a brief activation delay.
    if (token) await new Promise((resolve) => setTimeout(resolve, 2000));
    let data = await fetchJson<{ status?: string; results?: GooglePlace[]; next_page_token?: string }>(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`, "google_places", {}, 4000
    );
    if (token && data.status === "INVALID_REQUEST") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      data = await fetchJson<typeof data>(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`, "google_places", {}, 4000);
    }
    if (data.status === "ZERO_RESULTS") break;
    if (data.status !== "OK" || !Array.isArray(data.results)) throw new UpstreamError("google_places", data.status || "INVALID_RESPONSE");
    results.push(...data.results);
    token = data.next_page_token;
    if (!token || results.length >= MAX_RESULTS) break;
  }
  return results.flatMap((place): Mosque[] => {
    const location = place.geometry?.location;
    if (!place.place_id || !place.name || !validCoordinates(location?.lat, location?.lng)) return [];
    return [{
      placeId: place.place_id,
      name: place.name,
      lat: location!.lat!,
      lng: location!.lng!,
      address: place.vicinity || place.formatted_address,
      distanceType: "haversine_estimate",
      source: "google"
    }];
  });
}

async function searchOpenStreetMap(station: Station, radiusMeters: number): Promise<{ mosques: Mosque[]; updatedAt?: string }> {
  const endpoint = process.env.OVERPASS_API_URL || "https://overpass.private.coffee/api/interpreter";
  const query = `[out:json][timeout:10];nwr["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${station.lat},${station.lng});out center tags;`;
  const data = await fetchJson<{ elements?: OverpassElement[]; remark?: string; osm3s?: { timestamp_osm_base?: string } }>(endpoint, "openstreetmap", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Transit2Masjid/1.0 (https://github.com/aafham/Masjid-hunt)"
    },
    body: new URLSearchParams({ data: query }).toString()
  }, 13000);
  // Overpass may return HTTP 200 with a timeout remark and incomplete elements.
  if (data.remark || !Array.isArray(data.elements)) throw new UpstreamError("openstreetmap", "INCOMPLETE_RESPONSE");
  const mosques = data.elements.flatMap((element): Mosque[] => {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (!validCoordinates(lat, lng) || !["node", "way", "relation"].includes(element.type || "") || !Number.isInteger(element.id)) return [];
    const tags = element.tags || {};
    if (["private", "no"].includes(tags.access) || tags.disused === "yes" || tags.abandoned === "yes" || tags.construction === "yes") return [];
    const address = [tags["addr:housenumber"], tags["addr:street"], tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(", ");
    return [{
      placeId: `osm:${element.type}:${element.id}`,
      name: tags["name:ms"] || tags.name || "Tempat solat (nama belum tersedia)",
      lat: lat!,
      lng: lng!,
      address: address || undefined,
      distanceType: "haversine_estimate",
      source: "openstreetmap",
      osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`
    }];
  });
  return { mosques, updatedAt: data.osm3s?.timestamp_osm_base };
}

type MatrixElement = {
  status?: string;
  distance?: { value?: number };
  duration?: { value?: number };
};

async function enrichDistance(station: Station, mosques: Mosque[]): Promise<Mosque[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || !mosques.length) return mosques;
  const measured: Mosque[] = [];
  // Distance Matrix accepts at most 25 destinations in a request.
  for (let start = 0; start < mosques.length; start += 25) {
    const batch = mosques.slice(start, start + 25);
    try {
      const params = new URLSearchParams({
        origins: `${station.lat},${station.lng}`,
        destinations: batch.map((mosque) => `${mosque.lat},${mosque.lng}`).join("|"),
        mode: "walking",
        key
      });
      const data = await fetchJson<{ status?: string; rows?: Array<{ elements?: MatrixElement[] }> }>(
        `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`, "google_distance", {}, 4000
      );
      if (data.status !== "OK" || !Array.isArray(data.rows?.[0]?.elements)) throw new UpstreamError("google_distance", data.status || "INVALID_RESPONSE");
      const elements = data.rows![0].elements!;
      measured.push(...batch.map((mosque, index) => {
        const element = elements[index];
        const distance = element?.distance?.value;
        const duration = element?.duration?.value;
        if (element?.status !== "OK" || typeof distance !== "number" || !Number.isFinite(distance) || distance < 0) return mosque;
        return {
          ...mosque,
          distanceMeters: distance,
          durationMinutes: typeof duration === "number" && Number.isFinite(duration) && duration >= 0 ? Math.max(1, Math.round(duration / 60)) : undefined,
          distanceType: "walking_api" as const
        };
      }));
    } catch (error) {
      reportUpstream(error);
      // Preserve explicitly-labelled straight-line distance; never invent walking time.
      measured.push(...batch);
    }
  }
  return measured;
}
