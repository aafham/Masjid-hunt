"use client";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Bookmark, Check, ChevronRight, Compass, List, LoaderCircle, LocateFixed, Map, Share2, TrainFront, X } from "lucide-react";
import type { Mosque, SortOrder, Station } from "@/lib/types";
import { formatDistance, haversineMeters } from "@/lib/utils";
import StationPicker from "@/components/StationPicker";
import FilterBar from "@/components/FilterBar";
import LineBadge from "@/components/LineBadge";
import MosqueList from "@/components/MosqueList";
import LocationPrayerPanel from "@/components/LocationPrayerPanel";
import GoogleMapPreview from "@/components/GoogleMapPreview";
const MapCanvas = dynamic(() => import("@/components/MapCanvas"), { ssr: false, loading: () => <div className="map-loading" role="status">Memuatkan peta…</div> });
type ApiResponse = { mosques: Mosque[]; source: "google" | "openstreetmap"; total: number; warning?: string; coverageNote?: string; attribution?: { label: string; url: string }; error?: string; sourceUpdatedAt?: string; mapProvider?: "google" | "openstreetmap"; mapEmbedAvailable?: boolean };
type Props = { stations: Station[]; initialStationId?: string; initialRadius?: number; lockStation?: boolean };
const savedKey = "transit2masjid:saved:v1";
function subscribeSaved(listener: () => void) { window.addEventListener("storage", listener); window.addEventListener("saved-stations", listener); return () => { window.removeEventListener("storage", listener); window.removeEventListener("saved-stations", listener); }; }
function savedSnapshot() { try { return localStorage.getItem(savedKey) || "[]"; } catch { return "[]"; } }
function subscribeDesktop(listener: () => void) { const query = window.matchMedia("(min-width: 1024px)"); query.addEventListener("change", listener); return () => query.removeEventListener("change", listener); }
export default function ResultsExplorer({ stations, initialStationId, initialRadius = 2, lockStation = false }: Props) {
  const searchParams = useSearchParams();
  const requestedStation = searchParams.get("station");
  const selectedStationId = lockStation ? initialStationId || "" : stations.find(item => item.id === requestedStation)?.id || (requestedStation ? initialStationId || "" : "");
  const [changingStation, setChoosing] = useState(false);
  const choosing = !selectedStationId || changingStation;
  const requestedRadius = Number(searchParams.get("radius"));
  const radius = [1, 2, 3].includes(requestedRadius) ? requestedRadius : initialRadius;
  const [sort, setSort] = useState<SortOrder>("nearest");
  const [mosqueQuery, setMosqueQuery] = useState("");
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: ApiResponse; error?: string } | null>(null);
  const [selectedMosque, setSelectedMosque] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [notice, setNotice] = useState("");
  const savedRaw = useSyncExternalStore(subscribeSaved, savedSnapshot, () => "[]");
  const desktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia("(min-width: 1024px)").matches, () => false);
  const saved: string[] = useMemo(() => { try { const parsed: unknown = JSON.parse(savedRaw); return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []; } catch { return []; } }, [savedRaw]);
  const station = stations.find(item => item.id === selectedStationId);
  const key = selectedStationId + ":" + radius + ":" + retry;
  const current = result?.key === key ? result : null;
  const loading = Boolean(station && !choosing && !current);
  const mosques = useMemo(() => [...(current?.data?.mosques || [])].filter(item => item.name.toLocaleLowerCase("ms").includes(mosqueQuery.trim().toLocaleLowerCase("ms"))).sort((a, b) => (sort === "nearest" ? 1 : -1) * ((a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))), [current, mosqueQuery, sort]);
  const nearby = useMemo(() => geo ? stations.map(item => ({ station: item, distance: haversineMeters(geo.lat, geo.lng, item.lat, item.lng) })).sort((a, b) => a.distance - b.distance).filter((entry, index, list) => list.findIndex(other => other.station.name === entry.station.name) === index).slice(0, 3) : [], [stations, geo]);
  const suggestions = saved.length ? stations.filter(item => saved.includes(item.id)).slice(0, 6) : ["kl-sentral", "masjid-jamek", "bukit-bintang", "putrajaya-sentral-mrt"].map(id => stations.find(item => item.id === id)).filter((item): item is Station => Boolean(item));
  useEffect(() => {
    if (!selectedStationId || choosing) return;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort("timeout"), 30000);
    fetch("/api/mosques?" + new URLSearchParams({ stationId: selectedStationId, radius: String(radius) }), { signal: controller.signal })
      .then(async response => { const data: ApiResponse = await response.json(); if (!response.ok) throw new Error(data.error || "Data tidak dapat dimuatkan."); if (active) setResult({ key, data }); })
      .catch(error => { if (active) setResult({ key, error: error instanceof Error && error.name !== "AbortError" ? error.message : "Sambungan mengambil masa terlalu lama. Sila cuba lagi." }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [selectedStationId, radius, retry, key, choosing]);
  function updateUrl(id: string, nextRadius: number) {
    const url = new URL(window.location.href);
    if (!lockStation) url.searchParams.set("station", id);
    url.searchParams.set("radius", String(nextRadius));
    window.history.replaceState(null, "", url);
  }
  function chooseStation(id: string) { setChoosing(false); setSelectedMosque(null); setMosqueQuery(""); setGeoError(""); setView("list"); updateUrl(id, radius); }
  function changeRadius(value: number) { setSelectedMosque(null); if (station) updateUrl(station.id, value); }
  function locate() {
    if (!navigator.geolocation) { setGeoError("Pelayar ini tidak menyokong lokasi. Pilih stesen secara manual."); return; }
    setGeoLoading(true); setGeoError("");
    navigator.geolocation.getCurrentPosition(position => { setGeo({ lat: position.coords.latitude, lng: position.coords.longitude }); setGeoLoading(false); }, error => {
      setGeoLoading(false);
      setGeoError(error.code === 1 ? "Lokasi tidak dibenarkan. Pilih stesen secara manual atau benarkan lokasi dalam tetapan pelayar." : error.code === 3 ? "Lokasi mengambil masa terlalu lama. Cuba lagi di tempat dengan isyarat lebih baik." : "Lokasi belum dapat dikesan. Cuba lagi atau pilih stesen secara manual.");
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  }
  function toggleSave() {
    if (!station) return;
    try { localStorage.setItem(savedKey, JSON.stringify(saved.includes(station.id) ? saved.filter(id => id !== station.id) : [...saved, station.id])); window.dispatchEvent(new Event("saved-stations")); setNotice(saved.includes(station.id) ? "Stesen dikeluarkan daripada simpanan." : "Stesen disimpan pada peranti ini."); }
    catch { setNotice("Pelayar tidak membenarkan simpanan. Anda masih boleh kongsi pautan stesen."); }
  }
  async function share() {
    try { if (navigator.share) await navigator.share({ title: "Masjid berhampiran " + station?.name, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); setNotice("Pautan carian disalin."); } }
    catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setNotice("Pautan boleh disalin terus daripada bar alamat pelayar."); }
  }
  const selectPin = useCallback((id: string) => setSelectedMosque(id), []);
  function showOnMap(id: string) { setSelectedMosque(id); setView("map"); if (!desktop) window.requestAnimationFrame(() => document.getElementById("results-map")?.scrollIntoView({ behavior: "smooth", block: "start" })); }
  const selected = mosques.find(item => item.placeId === selectedMosque);
  return <div className="explorer">
    <section className="finder-panel" aria-label="Pilih stesen dan jarak carian">
      {choosing && !lockStation ? <>
        <StationPicker stations={stations} onChange={chooseStation} />
        <div className="location-row"><button type="button" className="location-button" onClick={locate} disabled={geoLoading}>{geoLoading ? <LoaderCircle size={18} className="spin" aria-hidden /> : <LocateFixed size={18} aria-hidden />}{geoLoading ? "Mengesan lokasi…" : "Guna lokasi saya"}</button><p>Atau pilih stesen di atas.</p>{station ? <button type="button" className="text-button" onClick={() => setChoosing(false)}>Batal</button> : null}</div>
        {geoError ? <p className="inline-error" role="alert">{geoError}</p> : null}
        {nearby.length ? <div className="nearby-options"><p className="small-heading">Stesen berhampiran lokasi anda <span>· anggaran garis lurus</span></p>{nearby.map(entry => <button type="button" className="nearby-option" key={entry.station.id} onClick={() => chooseStation(entry.station.id)}><TrainFront size={19} aria-hidden /><span><strong>{entry.station.name}</strong><small>{entry.station.line_name}</small></span><b>{formatDistance(entry.distance)}</b><ChevronRight size={16} aria-hidden /></button>)}</div> : <div className="quick-picks"><p>{saved.length ? "STESEN DISIMPAN" : "CUBA STESEN INI"}</p><div>{suggestions.map(item => <button type="button" key={item.id} onClick={() => chooseStation(item.id)}>{saved.length ? <Bookmark size={13} aria-hidden /> : null}{item.name}<ArrowRight size={14} aria-hidden /></button>)}</div></div>}
      </> : station ? <>
        <div className="selected-station"><span className="station-symbol"><TrainFront size={23} aria-hidden /></span><div><p>Bermula dari stesen</p><h2>{station.name}</h2><LineBadge station={station} /></div>{!lockStation ? <button type="button" className="text-button" onClick={() => setChoosing(true)}>Tukar <ChevronRight size={15} aria-hidden /></button> : <Link href="/stations" className="text-button">Tukar <ChevronRight size={15} aria-hidden /></Link>}</div>
        <FilterBar radiusKm={radius} onRadiusChange={changeRadius} sort={sort} onSortChange={setSort} mosqueQuery={mosqueQuery} onQueryChange={setMosqueQuery} />
      </> : null}
    </section>
    <div className="notice-region" role="status" aria-live="polite">{notice ? <span><Check size={15} aria-hidden />{notice}<button type="button" className="icon-button" onClick={() => setNotice("")} aria-label="Tutup makluman"><X size={14} /></button></span> : null}</div>
    {station && !choosing && !desktop ? <div className="mobile-prayer"><LocationPrayerPanel /></div> : null}
    {!station || choosing ? <div className="discovery-bottom"><LocationPrayerPanel /><Link href="/stations" className="network-note"><span className="network-note-icon"><Compass size={21} aria-hidden /></span><span><strong>Laluan Shah Alam kini tersedia</strong><small>Terokai laluan LRT, MRT & ERL yang beroperasi.</small></span><ArrowUpRightIcon /></Link></div> : <section className="results-layout" aria-label={"Masjid berhampiran " + station.name}>
      <div className={"results-column" + (view === "map" ? " mobile-list-hidden" : "")}>
        <div className="results-heading"><div><p className="eyebrow">PERSINGGAHAN ANDA</p><h2 aria-live="polite">{loading ? "Mencari masjid…" : current?.error ? "Cuba carian semula" : mosques.length + " masjid & surau"}</h2></div><div className="result-tools"><button type="button" className="icon-button" onClick={toggleSave} aria-pressed={saved.includes(station.id)} aria-label={saved.includes(station.id) ? "Buang stesen daripada simpanan" : "Simpan stesen"}><Bookmark size={19} fill={saved.includes(station.id) ? "currentColor" : "none"} /></button><button type="button" className="icon-button" aria-label="Kongsi carian ini" onClick={share}><Share2 size={18} /></button></div></div>
        <p className="distance-help">Jarak berjalan apabila tersedia. Jarak garis lurus dilabel anggaran.</p>
        <MosqueList mosques={mosques} station={station} loading={loading} error={current?.error ?? null} selectedId={selectedMosque} onSelect={showOnMap} onRetry={() => setRetry(n => n + 1)} hasQuery={Boolean(mosqueQuery.trim())} onClearQuery={() => setMosqueQuery("")} radius={radius} onExpandRadius={() => changeRadius(3)} />
        {current?.data ? <p className="data-attribution">Sumber: {current.data.attribution ? <a href={current.data.attribution.url} target="_blank" rel="noreferrer">{current.data.attribution.label}</a> : current.data.source === "google" ? "Google Maps" : "OpenStreetMap"}{current.data.sourceUpdatedAt ? <> · Data peta {new Intl.DateTimeFormat("ms-MY", { dateStyle: "medium", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(current.data.sourceUpdatedAt))}</> : null}<br />{current.data.coverageNote || "Liputan mungkin tidak lengkap. Semak akses dan pintu masuk sebelum berjalan."}{current.data.warning ? <><br />{current.data.warning}</> : null}</p> : null}
      </div>
      <aside className={"map-column" + (view !== "map" ? " mobile-map-hidden" : "")} aria-label="Peta dan waktu solat">
        {desktop ? <LocationPrayerPanel /> : null}
        {current?.error ? <p className="inline-error" role="alert">{current.error} <button type="button" className="text-button" onClick={() => setRetry(n => n + 1)}>Cuba lagi</button></p> : null}
        <div id="results-map" className="map-panel"><div className="map-heading"><strong>Sekitar {station.name}</strong><span><i /> Stesen <b /> Masjid</span></div>{desktop || view === "map" ? current?.data?.mapProvider === "google" ? <GoogleMapPreview station={station} mosque={selected || mosques[0]} embedAvailable={Boolean(current.data.mapEmbedAvailable)} /> : <MapCanvas station={station} mosques={mosques} selectedId={selectedMosque} onSelect={selectPin} /> : <div className="map-loading">Peta tersedia apabila dibuka.</div>}<p className="map-caption">{current?.data?.mapProvider === "google" ? "Peta dan laluan disediakan oleh Google Maps." : "Pin menunjukkan lokasi, bukan laluan berjalan. Pilih “Laluan berjalan” untuk navigasi."}</p>{selected ? <div className="map-selected"><strong>{selected.name}</strong><span>{formatDistance(selected.distanceMeters)} dari stesen</span><button type="button" className="text-button" onClick={() => { setView("list"); window.requestAnimationFrame(() => document.getElementById("mosque-" + mosques.indexOf(selected))?.scrollIntoView({ behavior: "smooth", block: "center" })); }}>Lihat butiran <ChevronRight size={16} aria-hidden /></button></div> : null}</div>
      </aside>
      <div className="mobile-view-toggle" role="group" aria-label="Paparan hasil"><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={17} aria-hidden /> Senarai</button><button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}><Map size={17} aria-hidden /> Peta</button></div>
    </section>}
  </div>;
}
function ArrowUpRightIcon() { return <ArrowRight size={19} aria-hidden />; }
