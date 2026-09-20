import { NextRequest, NextResponse } from "next/server";
import { parseCoordinates } from "@/lib/coordinates";
import { haversineMeters } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const origin = parseCoordinates(req.nextUrl.searchParams.get("origin"));
  const destination = parseCoordinates(req.nextUrl.searchParams.get("dest"));
  if (!origin || !destination) {
    return NextResponse.json({ error: "origin dan dest mesti pasangan lat,lng yang sah." }, { status: 400 });
  }
  return NextResponse.json({
    distanceMeters: haversineMeters(origin.lat, origin.lng, destination.lat, destination.lng),
    distanceType: "haversine_estimate"
  });
}
