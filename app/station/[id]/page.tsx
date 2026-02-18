import { notFound } from "next/navigation";
import ResultsExplorer from "@/components/ResultsExplorer";
import { getStationById, getStations } from "@/lib/stations";

type Props = {
  params: { id: string };
};

export default function StationDetailPage({ params }: Props) {
  const station = getStationById(params.id);
  if (!station) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-gradient-to-br from-brand/10 to-accent p-4">
        <h2 className="text-lg font-bold">{station.name}</h2>
        <p className="text-sm text-slate-700">
          {station.line_type} | {station.line_name}
        </p>
      </div>
      <ResultsExplorer stations={getStations()} initialStationId={station.id} lockStation />
    </section>
  );
}
