import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import LocationPrayerPanel from "@/components/LocationPrayerPanel";

export const metadata: Metadata = {
  title: "Transit2Masjid",
  description: "Rancang jalan kaki ke masjid dari stesen terdekat"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms">
      <body>
        <Header />
        <LocationPrayerPanel />
        <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4">{children}</main>
      </body>
    </html>
  );
}
