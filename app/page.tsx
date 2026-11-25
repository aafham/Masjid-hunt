import type { Metadata } from "next";
import { ArrowRight, MapPin, TrainFront } from "lucide-react";
import ResultsExplorer from "@/components/ResultsExplorer";
import { getStationById, getStations } from "@/lib/stations";
export const metadata: Metadata = { alternates: { canonical: "/" } };
export default async function HomePage({ searchParams }: { searchParams: Promise<{ station?: string; radius?: string }> }) {
  const params = await searchParams;
  const station = params.station ? getStationById(params.station) : undefined;
  const radius = [1, 2, 3].includes(Number(params.radius)) ? Number(params.radius) : 2;
  return <>
    <section className="hero" aria-labelledby="home-title"><div>
      <h1 id="home-title">Cari masjid <span>dekat stesen.</span></h1>
      <p className="hero-copy">Pilih stesen LRT, MRT atau ERL untuk lihat masjid, surau dan laluan berjalan.</p>
    </div><div className="journey-art" aria-hidden="true"><span><TrainFront size={30} /></span><i /><ArrowRight size={22} /><i /><span><MapPin size={30} /></span></div></section>
    <ResultsExplorer key={(station?.id || "search") + ":" + radius} stations={getStations()} initialStationId={station?.id} initialRadius={radius} />
  </>;
}
