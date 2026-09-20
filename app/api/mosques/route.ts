import { NextRequest, NextResponse } from "next/server";
import { findMosquesByStation } from "@/lib/mosques";
import { getStationById } from "@/lib/stations";
import { parseRadius } from "@/lib/coordinates";
import { UpstreamError } from "@/lib/upstream";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const stationId = (req.nextUrl.searchParams.get("stationId") || "").trim();
  const radius = parseRadius(req.nextUrl.searchParams.get("radius"));
  const sort = req.nextUrl.searchParams.get("sort") ?? "nearest";
  if (!stationId) return NextResponse.json({ error: "stationId diperlukan" }, { status: 400 });
  if (!radius) return NextResponse.json({ error: "Radius mesti 1, 2 atau 3 km." }, { status: 400 });
  if (sort !== "nearest" && sort !== "farthest") return NextResponse.json({ error: "Susunan tidak sah." }, { status: 400 });
  const station = getStationById(stationId);
  if (!station) return NextResponse.json({ error: "Stesen tidak dijumpai" }, { status: 404 });
  try {
    const result = await findMosquesByStation(station, radius, sort);
    return NextResponse.json({
      station, radiusKm: radius, total: result.mosques.length, ...result,
      // Google-derived places or walking data must use the Google map surface.
      mapProvider: result.source === "google" || result.mosques.some((mosque) => mosque.distanceType === "walking_api")
        ? "google" : "openstreetmap",
      mapEmbedAvailable: Boolean(process.env.GOOGLE_MAPS_EMBED_API_KEY),
      coverageNote: "Hasil bergantung pada liputan sumber dan mungkin tidak lengkap. Semak akses masuk sebelum berjalan."
    });
  } catch (error) {
    console.warn("[mosques] search failed", error instanceof UpstreamError ? error.message : "SEARCH_FAILED");
    return NextResponse.json({
      error: "Carian masjid belum dapat dimuatkan. Cuba lagi sebentar lagi.",
      code: "PROVIDER_UNAVAILABLE"
    }, { status: 503, headers: { "Retry-After": "30" } });
  }
}
