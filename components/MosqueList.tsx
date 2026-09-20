"use client";
import { MapPinOff, RefreshCw } from "lucide-react";
import type { Mosque, Station } from "@/lib/types";
import MosqueCard from "@/components/MosqueCard";
type Props = { mosques: Mosque[]; station: Station; loading: boolean; error: string | null; selectedId: string | null; onSelect: (id: string) => void; onRetry: () => void; hasQuery: boolean; onClearQuery: () => void; radius: number; onExpandRadius: () => void };
export default function MosqueList({ mosques, station, loading, error, selectedId, onSelect, onRetry, hasQuery, onClearQuery, radius, onExpandRadius }: Props) {
  if (loading) return <div className="result-skeletons" role="status" aria-label="Mencari masjid berhampiran"><span className="sr-only">Mencari masjid berhampiran…</span>{[0, 1, 2].map(n => <div key={n} className="skeleton-card"><div /><div /><div /></div>)}</div>;
  if (error) return <div className="empty-state error-state" role="alert"><MapPinOff size={30} aria-hidden /><h3>Carian belum dapat diselesaikan.</h3><p>{error}</p><button type="button" className="button-primary" onClick={onRetry}><RefreshCw size={16} aria-hidden /> Cuba lagi</button></div>;
  if (!mosques.length) return <div className="empty-state" role="status"><MapPinOff size={30} aria-hidden /><h3>{hasQuery ? "Tiada nama yang sepadan." : "Tiada masjid ditemui dalam " + radius + " km."}</h3><p>{hasQuery ? "Carian nama ini hanya menapis hasil berhampiran " + station.name + "." : "Liputan data mungkin belum lengkap. Cuba jarak lebih jauh atau stesen lain."}</p>{hasQuery ? <button type="button" className="button-secondary" onClick={onClearQuery}>Kosongkan carian nama</button> : radius < 3 ? <button type="button" className="button-secondary" onClick={onExpandRadius}>Luaskan ke 3 km</button> : null}</div>;
  return <div className="mosque-list">{mosques.map((mosque, index) => <MosqueCard key={mosque.placeId} mosque={mosque} station={station} index={index} selected={selectedId === mosque.placeId} onSelect={() => onSelect(mosque.placeId)} />)}</div>;
}
