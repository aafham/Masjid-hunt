import { NextRequest, NextResponse } from "next/server";
import { getPrayerTimes, malaysiaDate, validPrayerDate } from "@/lib/prayer-times";
import { getPrayerZone, PRAYER_ZONES } from "@/lib/region";
import { UpstreamError } from "@/lib/upstream";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const zone = getPrayerZone(req.nextUrl.searchParams.get("zone") || "");
  const date = req.nextUrl.searchParams.get("date") ?? malaysiaDate();
  if (!zone) {
    return NextResponse.json({
      error: "Pilih zon waktu solat anda. Lokasi GPS tidak digunakan untuk meneka sempadan zon.",
      code: "CHOOSE_ZONE", zones: PRAYER_ZONES
    }, { status: 400 });
  }
  if (!validPrayerDate(date)) {
    return NextResponse.json({ error: "Tarikh mesti sah dalam format YYYY-MM-DD." }, { status: 400 });
  }
  try {
    return NextResponse.json(await getPrayerTimes(zone.code, date), {
      headers: { "Cache-Control": "private, no-store" }
    });
  } catch (error) {
    console.warn("[prayer-times] upstream unavailable", error instanceof UpstreamError ? error.message : "UNKNOWN_PROVIDER_ERROR");
    return NextResponse.json({
      error: "Jadual rasmi JAKIM belum dapat dimuatkan. Cuba lagi atau semak portal e-Solat.",
      code: "PROVIDER_UNAVAILABLE", sourceUrl: "https://www.e-solat.gov.my/"
    }, { status: 503, headers: { "Retry-After": "30" } });
  }
}
