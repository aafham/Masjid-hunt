"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown, Moon, RefreshCw } from "lucide-react";
import { PRAYER_ZONES } from "@/lib/region";
type PrayerResponse = { zone: string; area: string; date: string; timezone: string; source: "jakim"; timings: Record<string, string>; error?: string };
const prayers = [{ key: "Fajr", label: "Subuh" }, { key: "Dhuhr", label: "Zohor" }, { key: "Asr", label: "Asar" }, { key: "Maghrib", label: "Maghrib" }, { key: "Isha", label: "Isyak" }];
function malaysiaDate() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
function subscribeZone(listener: () => void) { window.addEventListener("prayer-zone", listener); window.addEventListener("storage", listener); return () => { window.removeEventListener("prayer-zone", listener); window.removeEventListener("storage", listener); }; }
let memoryZone = "WLY01";
function zoneSnapshot() { try { const value = localStorage.getItem("transit2masjid:prayer-zone:v1"); return PRAYER_ZONES.some(item => item.code === value) ? value! : memoryZone; } catch { return memoryZone; } }
export default function LocationPrayerPanel() {
  const zone = useSyncExternalStore(subscribeZone, zoneSnapshot, () => "WLY01");
  function setZone(value: string) { memoryZone = value; try { localStorage.setItem("transit2masjid:prayer-zone:v1", value); } catch { /* Keep the choice for this session when storage is blocked. */ } window.dispatchEvent(new Event("prayer-zone")); }
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(malaysiaDate);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: PrayerResponse; error?: string } | null>(null);
  const key = zone + ":" + day + ":" + retry;
  const current = result?.key === key ? result : null;
  useEffect(() => {
    const refresh = () => { setDay(malaysiaDate()); setRetry(n => n + 1); };
    const timer = window.setInterval(() => setDay(malaysiaDate()), 60000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort("timeout"), 15000);
    let active = true;
    fetch("/api/prayer-times?" + new URLSearchParams({ zone, date: day }), { signal: controller.signal })
      .then(async response => { const data: PrayerResponse = await response.json(); if (!response.ok) throw new Error(data.error || "Waktu solat belum tersedia."); if (active) setResult({ key, data }); })
      .catch(error => { if (active) setResult({ key, error: error instanceof Error && error.name !== "AbortError" ? error.message : "Sambungan mengambil masa terlalu lama." }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [zone, day, retry, key]);
  return <section className="prayer-panel" aria-label="Waktu solat rasmi JAKIM">
    <button className="prayer-summary" type="button" aria-expanded={open} aria-controls="prayer-details" onClick={() => setOpen(!open)}>
      <Moon size={19} aria-hidden /><span><strong>Waktu solat</strong><small>{zone === "WLY01" ? "Kuala Lumpur & Putrajaya" : "Selangor · " + zone} · JAKIM</small></span><ChevronDown size={18} className={open ? "rotate" : ""} aria-hidden />
    </button>
    {open ? <div id="prayer-details" className="prayer-details">
      <label htmlFor="prayer-zone">Zon pilihan <span>(bukan lokasi automatik)</span></label>
      <select id="prayer-zone" value={zone} onChange={e => setZone(e.target.value)}>{PRAYER_ZONES.map(item => <option key={item.code} value={item.code}>{item.code} — {item.area}</option>)}</select>
      <p className="helper">{day} · Waktu Malaysia (UTC+8)</p>
      {!current ? <p role="status">Memuatkan jadual rasmi…</p> : current.error ? <div className="inline-error" role="alert"><p>{current.error}</p><button className="text-button" type="button" onClick={() => setRetry(n => n + 1)}><RefreshCw size={15} aria-hidden /> Cuba lagi</button></div> : <div className="prayer-times">{prayers.map(prayer => <div key={prayer.key}><span>{prayer.label}</span><strong>{current.data?.timings[prayer.key] ?? "—"}</strong></div>)}</div>}
      <a href="https://www.e-solat.gov.my/" target="_blank" rel="noreferrer" className="source-link">Semak zon dan jadual di e-Solat JAKIM ↗</a>
    </div> : null}
  </section>;
}
