import type { MetadataRoute } from "next";
import { getStations } from "@/lib/stations";
export default function sitemap(): MetadataRoute.Sitemap { const base = "https://transit2masjid.vercel.app"; return [{ url: base, priority: 1 }, { url: base + "/stations", priority: 0.8 }, ...getStations().map(station => ({ url: base + "/station/" + station.id, priority: 0.6 }))]; }
