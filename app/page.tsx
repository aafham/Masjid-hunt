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
      <p className="eyebrow"><span className="live-dot" /> UNTUK PERJALANAN HARIAN ANDA</p>
      <h1 id="home-title">Turun tren.<br /><span>Singgah solat.</span></h1>
      <p className="hero-copy">Temui masjid dan surau berhampiran stesen anda.<br className="desktop-only" /> Pilih stesen, semak jarak, teruskan perjalanan.</p>
    </div><div className="journey-art" aria-hidden="true"><span><TrainFront size={30} /></span><i /><ArrowRight size={22} /><i /><span><MapPin size={30} /></span><p>Satu stesen. Banyak persinggahan.</p></div></section>
    <ResultsExplorer key={(station?.id || "search") + ":" + radius} stations={getStations()} initialStationId={station?.id} initialRadius={radius} />
  </>;
}
