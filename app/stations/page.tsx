import { socialImage } from "@/lib/social-image";
import type { Metadata } from "next";
import Link from "next/link";
import StationDirectory from "@/components/StationDirectory";
import { getStations, transitMetadata } from "@/lib/stations";
const title = "Semua stesen & laluan";
const description = "Pilih laluan LRT Kelana Jaya, Ampang, Sri Petaling, Shah Alam, MRT Kajang, Putrajaya dan ERL untuk mencari masjid berhampiran.";
export const metadata: Metadata = {
  title, description, alternates: { canonical: "/stations" },
  openGraph: { images: [socialImage], title, description, url: "/stations", locale: "ms_MY", siteName: "Transit2Masjid", type: "website" }
};
function formatReviewDate(date: string) {
  return new Date(date).toLocaleDateString("ms-MY", { dateStyle: "long", timeZone: "Asia/Kuala_Lumpur" });
}

export default function StationsPage() {
  return <><section className="directory-heading"><h1>Direktori stesen</h1><p>Cari nama atau kod stesen, atau tapis mengikut laluan.</p><Link href="/peta" className="text-button">Lihat peta rangkaian →</Link></section>
    <StationDirectory stations={getStations()} />
    <section className="coverage-note" aria-labelledby="coverage-title">
      <h2 id="coverage-title">Liputan dan sumber data</h2>
      <p>Direktori ini merangkumi stesen LRT, MRT dan ERL yang beroperasi, termasuk 20 stesen Laluan Shah Alam. Stesen pertukaran disenaraikan pada setiap laluan yang melaluinya.</p>
      <p>Semakan LRT dan MRT pada <time dateTime={transitMetadata.rapidRailCheckedAt}>{formatReviewDate(transitMetadata.rapidRailCheckedAt)}</time>. Semakan ERL pada <time dateTime={transitMetadata.erlCheckedAt}>{formatReviewDate(transitMetadata.erlCheckedAt)}</time>.</p>
      <div>
        <a href="https://developer.data.gov.my/realtime-api/gtfs-static" target="_blank" rel="noreferrer">Data GTFS Prasarana ↗</a>
        <a href="https://www.prasarana.com.my/rapid-rail/" target="_blank" rel="noreferrer">Maklumat operasi Prasarana ↗</a>
        <a href="https://www.kliaekspres.com/" target="_blank" rel="noreferrer">Maklumat ERL ↗</a>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Koordinat ERL © OpenStreetMap ↗</a>
      </div>
    </section>
  </>;
}
