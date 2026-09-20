"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, TrainFront } from "lucide-react";
export default function Header() {
  const pathname = usePathname();
  return <header className="site-header"><div className="page-width header-inner">
    <Link href="/" className="brand" aria-label="Transit2Masjid — halaman utama"><span className="brand-mark"><TrainFront size={23} strokeWidth={1.8} aria-hidden /></span><span>transit<span className="brand-two">2</span>masjid<span className="brand-dot">.</span></span></Link>
    <nav aria-label="Navigasi utama" className="header-nav"><Link href="/" aria-current={pathname === "/" ? "page" : undefined}>Cari masjid</Link><Link href="/stations" aria-current={pathname.startsWith("/station") ? "page" : undefined}>Stesen <ArrowUpRight size={15} aria-hidden /></Link></nav>
  </div></header>;
}
