import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-brand/20 bg-gradient-to-r from-brandDark to-brand px-4 py-4 text-white shadow">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Transit2Masjid</h1>
          <p className="text-xs text-white/90">Rancang jalan kaki ke masjid dari stesen terdekat</p>
        </div>
        <nav className="flex gap-2 text-sm font-medium">
          <Link href="/" className="rounded-md bg-white/20 px-3 py-1.5 hover:bg-white/30">
            Home
          </Link>
          <Link href="/stations" className="rounded-md bg-white/20 px-3 py-1.5 hover:bg-white/30">
            Stations
          </Link>
        </nav>
      </div>
    </header>
  );
}
