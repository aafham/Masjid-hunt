import { socialImage } from "@/lib/social-image";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import ResultsExplorer from "@/components/ResultsExplorer";
import { getStationById } from "@/lib/stations";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ radius?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const station = getStationById(id);
  if (!station) return { title: "Stesen tidak dijumpai" };
  const title = `Masjid berhampiran ${station.name} (${station.line_name})`;
  const description = `Cari masjid dan surau berhampiran ${station.name}, ${station.line_name}. Semak jarak dan laluan berjalan.`;
  const url = "/station/" + station.id;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { images: [socialImage], title, description, url, locale: "ms_MY", type: "website", siteName: "Transit2Masjid" }
  };
}
export default async function StationDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const station = getStationById(id);
  if (!station) notFound();
  const query = await searchParams;
  const radius = [1, 2, 3].includes(Number(query.radius)) ? Number(query.radius) : 2;
  if (id !== station.id) permanentRedirect("/station/" + station.id + "?radius=" + radius);
  return <><Link className="back-link" href="/stations"><ArrowLeft size={17} aria-hidden /> Semua stesen</Link>
    <div className="detail-heading"><h1>{station.name}</h1><p>{station.line_name}</p></div>
    <ResultsExplorer key={station.id + ":" + radius} stations={[station]} initialStationId={station.id} initialRadius={radius} lockStation />
  </>;
}
