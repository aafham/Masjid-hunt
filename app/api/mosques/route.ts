import { NextRequest, NextResponse } from "next/server";
import { findMosquesByStation } from "@/lib/mosques";
import { getStationById } from "@/lib/stations";
import { clampRadius } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const stationId = (req.nextUrl.searchParams.get("stationId") || "").trim();
    const radiusInput = Number(req.nextUrl.searchParams.get("radius") || "2");
    const sortInput = (req.nextUrl.searchParams.get("sort") || "nearest").toLowerCase();

    if (!stationId) {
      return NextResponse.json({ error: "stationId diperlukan" }, { status: 400 });
    }

    const station = getStationById(stationId);
    if (!station) {
      return NextResponse.json({ error: "Station tidak dijumpai" }, { status: 404 });
    }

    const radius = clampRadius(radiusInput);
    const sort = sortInput === "farthest" ? "farthest" : "nearest";

    const { mosques, source } = await findMosquesByStation(station, radius, sort);

    return NextResponse.json({
      station,
      radiusKm: radius,
      total: mosques.length,
      source,
      mosques
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ralat semasa mendapatkan senarai masjid"
      },
      { status: 500 }
    );
  }
}
