"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Search, TrainFront } from "lucide-react";

const destinations = [
  { href: "/", label: "Cari masjid", icon: Search },
  { href: "/peta", label: "Peta", icon: Map },
  { href: "/stations", label: "Stesen", icon: TrainFront }
];

export default function Header() {
  const pathname = usePathname();
  return <header className="site-header"><div className="page-width header-inner">
    <Link href="/" className="brand" aria-label="Transit2Masjid — halaman utama"><span className="brand-mark"><TrainFront size={23} strokeWidth={1.8} aria-hidden /></span><span>transit<span className="brand-two">2</span>masjid<span className="brand-dot">.</span></span></Link>
    <nav aria-label="Navigasi utama" className="header-nav">
      {destinations.map(({ href, label, icon: Icon }) => <Link
        key={href}
        href={href}
        aria-current={pathname === href ? "page" : href === "/stations" && pathname.startsWith("/station/") ? "location" : undefined}
      ><Icon size={18} aria-hidden />{label}</Link>)}
    </nav>
  </div></header>;
}
