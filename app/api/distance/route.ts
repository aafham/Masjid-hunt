import { NextRequest, NextResponse } from "next/server";
import { haversineMeters } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const origin = (req.nextUrl.searchParams.get("origin") || "").trim();
  const dest = (req.nextUrl.searchParams.get("dest") || "").trim();

  if (!origin || !dest) {
    return NextResponse.json({ error: "origin dan dest diperlukan" }, { status: 400 });
  }

  const [oLat, oLng] = origin.split(",").map(Number);
  const [dLat, dLng] = dest.split(",").map(Number);

  if ([oLat, oLng, dLat, dLng].some((value) => !Number.isFinite(value))) {
    return NextResponse.json({ error: "format koordinat tidak sah" }, { status: 400 });
  }

  const meters = haversineMeters(oLat, oLng, dLat, dLng);
  return NextResponse.json({ distanceMeters: meters });
}
