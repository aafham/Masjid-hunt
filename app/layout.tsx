import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Masjid Hunt",
  description: "Pejalan kaki ke masjid paling dekat"
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
        <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-4">{children}</main>
      </body>
    </html>
  );
}
