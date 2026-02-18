import { NextRequest, NextResponse } from "next/server";
import { detectPrayerArea } from "@/lib/region";

const CACHE_TTL_MS = 10 * 60 * 1000;

type CachedPrayer = {
  expiresAt: number;
  payload: {
    area: string;
    timings: Record<string, string>;
    source: "aladhan";
  };
};

const prayerCache = new Map<string, CachedPrayer>();

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat") || "");
  const lng = Number(req.nextUrl.searchParams.get("lng") || "");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat/lng tidak sah" }, { status: 400 });
  }

  const area = detectPrayerArea(lat, lng);
  if (!area) {
    return NextResponse.json(
      { error: "Waktu solat auto tersedia untuk kawasan KL/Selangor sahaja." },
      { status: 400 }
    );
  }

  const cacheKey = `${area}:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const cached = prayerCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload);
  }

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      method: "11" // regional method suitable for Southeast Asia
    });

    const response = await fetch(`https://api.aladhan.com/v1/timings?${params.toString()}`, {
      next: { revalidate: 600 }
    });

    if (!response.ok) {
      throw new Error("Gagal mendapatkan waktu solat");
    }

    const data = (await response.json()) as {
      data?: {
        timings?: Record<string, string>;
      };
    };

    const timings = data.data?.timings;
    if (!timings) {
      throw new Error("Format waktu solat tidak sah");
    }

    const payload = {
      area,
      source: "aladhan" as const,
      timings: {
        Fajr: normalizeTime(timings.Fajr),
        Dhuhr: normalizeTime(timings.Dhuhr),
        Asr: normalizeTime(timings.Asr),
        Maghrib: normalizeTime(timings.Maghrib),
        Isha: normalizeTime(timings.Isha)
      }
    };

    prayerCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Ralat semasa ambil waktu solat."
      },
      { status: 500 }
    );
  }
}

function normalizeTime(value?: string): string {
  if (!value) {
    return "-";
  }
  return value.split(" ")[0] ?? value;
}
