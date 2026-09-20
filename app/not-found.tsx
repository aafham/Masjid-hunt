import Link from "next/link";
import { MapPinOff } from "lucide-react";
export default function NotFound() { return <section className="empty-state"><MapPinOff size={34} aria-hidden /><h1>Persinggahan ini tidak dijumpai.</h1><p>Pilih stesen daripada senarai terkini untuk meneruskan carian.</p><Link className="button-primary" href="/stations">Lihat semua stesen</Link></section>; }
