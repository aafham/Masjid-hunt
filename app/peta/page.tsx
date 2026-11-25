import { socialImage } from "@/lib/social-image";
import type { Metadata } from "next";
import StationDirectory from "@/components/StationDirectory";
import { getStations } from "@/lib/stations";

const title = "Peta rangkaian transit";
const description = "Terokai lapan laluan LRT, MRT dan ERL. Pilih stesen pada peta untuk mencari masjid dan surau berhampiran.";
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/peta" },
  openGraph: { images: [socialImage], title, description, url: "/peta", locale: "ms_MY", type: "website" }
};

export default function NetworkPage() {
  return <>
    <section className="directory-heading network-page-heading">
      <h1>Peta rangkaian transit</h1>
      <p>Pilih laluan atau tekan stesen untuk mencari masjid berhampiran.</p>
    </section>
    <StationDirectory stations={getStations()} mode="map" />
  </>;
}
