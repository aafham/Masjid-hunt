import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import Header from "@/components/Header";
export const metadata: Metadata = {
  metadataBase: new URL("https://transit2masjid.vercel.app"),
  title: { default: "Transit2Masjid — Cari masjid dari stesen anda", template: "%s | Transit2Masjid" },
  description: "Cari masjid dan surau berhampiran stesen LRT, MRT dan ERL. Termasuk Laluan Shah Alam, peta lokasi dan waktu solat rasmi JAKIM.",
  openGraph: { title: "Transit2Masjid", description: "Turun tren. Temui masjid berhampiran.", locale: "ms_MY", type: "website", images: [{ url: "/opengraph-image", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image" }
};
export const viewport: Viewport = { themeColor: "#173f35" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ms" data-scroll-behavior="smooth"><body><a href="#main" className="skip-link">Langkau ke kandungan</a><Header />
    <main id="main" className="page-width main-content">{children}</main>
    <footer className="page-width site-footer"><p>Perjalanan anda, persinggahan yang bermakna.</p><div><Link href="/stations">Liputan & sumber data</Link><span>Waktu solat oleh JAKIM</span></div></footer>
  </body></html>;
}
