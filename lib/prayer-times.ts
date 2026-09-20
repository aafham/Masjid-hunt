import { getPrayerZone, type PrayerZone } from "@/lib/region";
import { ExpiringCache } from "@/lib/server-cache";
import { fetchJson, UpstreamError } from "@/lib/upstream";

export type PrayerTimes = {
  zone: PrayerZone;
  area: string;
  date: string;
  timezone: "Asia/Kuala_Lumpur";
  source: "jakim";
  timings: { Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string };
};

const cache = new ExpiringCache<PrayerTimes>(64, 6 * 60 * 60 * 1000);
const inFlight = new Map<string, Promise<PrayerTimes>>();

export function malaysiaDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(now);
}

export function validPrayerDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function jakimDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (validPrayerDate(value)) return value;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const match = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(value);
  if (!match) return null;
  const month = months.indexOf(match[2].toLowerCase()) + 1;
  if (!month) return null;
  const date = `${match[3]}-${String(month).padStart(2, "0")}-${match[1]}`;
  return validPrayerDate(date) ? date : null;
}

function time(value: unknown): string {
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) {
    throw new UpstreamError("jakim", "INVALID_TIME");
  }
  return value.slice(0, 5);
}

export async function getPrayerTimes(zone: PrayerZone, date: string): Promise<PrayerTimes> {
  const selected = getPrayerZone(zone);
  if (!selected || !validPrayerDate(date)) throw new Error("Zon atau tarikh tidak sah");
  const key = `${zone}:${date}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const current = inFlight.get(key);
  if (current) return current;
  if (inFlight.size >= 12) throw new UpstreamError("jakim", "BUSY");
  const pending = loadPrayerTimes(zone, date, selected.area);
  inFlight.set(key, pending);
  try {
    const payload = await pending;
    cache.set(key, payload);
    return payload;
  } finally {
    inFlight.delete(key);
  }
}

async function loadPrayerTimes(zone: PrayerZone, date: string, area: string): Promise<PrayerTimes> {
  const params = new URLSearchParams({ r: "esolatApi/takwimsolat", period: "date", zone, date });
  const data = await fetchJson<{
    status?: string;
    zone?: string;
    prayerTime?: Array<Record<string, unknown>>;
  }>(`https://www.e-solat.gov.my/index.php?${params}`, "jakim");
  if (data.status !== "OK!" || data.zone !== zone || !Array.isArray(data.prayerTime)) {
    throw new UpstreamError("jakim", "INVALID_RESPONSE");
  }
  const day = data.prayerTime.find((entry) => jakimDate(entry.date) === date);
  if (!day) throw new UpstreamError("jakim", "DATE_MISMATCH");
  return {
    zone, area, date, timezone: "Asia/Kuala_Lumpur", source: "jakim",
    timings: {
      Fajr: time(day.fajr), Dhuhr: time(day.dhuhr), Asr: time(day.asr),
      Maghrib: time(day.maghrib), Isha: time(day.isha)
    }
  };
}
