import { NextRequest, NextResponse } from "next/server";
import { parseCoordinates } from "@/lib/coordinates";

export async function GET(req: NextRequest) {
  const origin = parseCoordinates(req.nextUrl.searchParams.get("origin"));
  const destination = parseCoordinates(req.nextUrl.searchParams.get("destination"));
  if (!origin || !destination) {
    return NextResponse.json({ error: "origin/destination tidak sah" }, { status: 400 });
  }
  // Only this dedicated browser-visible key may be exposed in an embed redirect.
  const key = process.env.GOOGLE_MAPS_EMBED_API_KEY;
  if (key) {
    const url = new URL("https://www.google.com/maps/embed/v1/directions");
    url.searchParams.set("key", key);
    url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
    url.searchParams.set("destination", `${destination.lat},${destination.lng}`);
    url.searchParams.set("mode", "walking");
    return NextResponse.redirect(url);
  }
  // A keyless destination preview, not a walking route calculation.
  const url = new URL("https://www.openstreetmap.org/export/embed.html");
  const pad = 0.006;
  url.searchParams.set("bbox", [Math.max(-180, destination.lng - pad), Math.max(-90, destination.lat - pad), Math.min(180, destination.lng + pad), Math.min(90, destination.lat + pad)].join(","));
  url.searchParams.set("layer", "mapnik");
  url.searchParams.set("marker", `${destination.lat},${destination.lng}`);
  return NextResponse.redirect(url);
}
