import ResultsExplorer from "@/components/ResultsExplorer";
import { getStations } from "@/lib/stations";

export default function HomePage() {
  const stations = getStations();

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-gradient-to-br from-brand/15 to-accent p-4">
        <h2 className="text-lg font-bold">Cari Masjid Berdekatan Stesen</h2>
        <p className="text-sm text-slate-700">
          Pilih mana-mana stesen LRT/MRT/ERL dalam senarai, tetapkan radius, dan terus dapat
          senarai masjid paling dekat untuk pejalan kaki.
        </p>
      </div>
      <ResultsExplorer stations={stations} />
    </section>
  );
}
