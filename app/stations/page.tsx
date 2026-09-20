import type { Metadata } from "next";
import StationDirectory from "@/components/StationDirectory";
import { getStations } from "@/lib/stations";
export const metadata: Metadata = { title: "Semua stesen & laluan", description: "Pilih laluan LRT Kelana Jaya, Ampang, Sri Petaling, Shah Alam, MRT Kajang, Putrajaya dan ERL untuk mencari masjid berhampiran.", alternates: { canonical: "/stations" } };
export default function StationsPage() {
  return <><section className="directory-heading"><p className="eyebrow">RANGKAIAN TRANSIT ANDA</p><h1>Setiap laluan,<br /><span>satu persinggahan.</span></h1><p>Pilih kategori dan laluan, kemudian tekan stesen anda.</p></section>
    <StationDirectory stations={getStations()} />
    <section className="coverage-note" aria-labelledby="coverage-title"><h2 id="coverage-title">Liputan yang jelas, perjalanan lebih mudah.</h2><p>Senarai meliputi laluan beroperasi di Lembah Klang dan ERL, termasuk 20 stesen Laluan Shah Alam. MRT3 dan stesen yang belum dibuka tidak dimasukkan sebagai pilihan perjalanan.</p><p>Disemak 20 September 2026. Stesen pertukaran mungkin mempunyai lebih daripada satu pilihan laluan.</p><div><a href="https://developer.data.gov.my/realtime-api/gtfs-static" target="_blank" rel="noreferrer">Data GTFS Prasarana ↗</a><a href="https://www.prasarana.com.my/rapid-rail/" target="_blank" rel="noreferrer">Maklumat operasi Prasarana ↗</a><a href="https://www.kliaekspres.com/" target="_blank" rel="noreferrer">Maklumat ERL ↗</a><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Koordinat ERL © OpenStreetMap ↗</a></div></section>
  </>;
}
