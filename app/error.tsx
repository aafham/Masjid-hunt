"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="empty-state" role="alert"><h1>Halaman tidak dapat dimuatkan.</h1><p>Pilihan anda mungkin masih tersedia selepas mencuba semula.</p><button type="button" className="button-primary" onClick={reset}>Cuba lagi</button></section>; }
