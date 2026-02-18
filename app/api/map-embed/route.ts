import { NextRequest, NextResponse } from "next/server";

function sanitizeCoord(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const cleaned = value.trim();
  if (!/^[-0-9.,]+$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY tiada" }, { status: 400 });
  }

  const origin = sanitizeCoord(req.nextUrl.searchParams.get("origin"));
  const destination = sanitizeCoord(req.nextUrl.searchParams.get("destination"));

  if (!origin || !destination) {
    return NextResponse.json({ error: "origin/destination tidak sah" }, { status: 400 });
  }

  const embedUrl = new URL("https://www.google.com/maps/embed/v1/directions");
  embedUrl.searchParams.set("key", key);
  embedUrl.searchParams.set("origin", origin);
  embedUrl.searchParams.set("destination", destination);
  embedUrl.searchParams.set("mode", "walking");

  return NextResponse.redirect(embedUrl);
}
