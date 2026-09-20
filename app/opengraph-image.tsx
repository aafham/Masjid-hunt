import { ImageResponse } from "next/og";
export const alt = "Transit2Masjid — Turun tren. Singgah solat.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() { return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#173f35", color: "#f8faf2", padding: 80, justifyContent: "space-between" }}><div style={{ display: "flex", fontSize: 32 }}>transit2masjid.</div><div style={{ display: "flex", flexDirection: "column", fontSize: 84, fontWeight: 700 }}><span>Turun tren.</span><span style={{ color: "#d9ecb5" }}>Singgah solat.</span></div><div style={{ display: "flex", fontSize: 26 }}>Masjid & surau berhampiran LRT · MRT · ERL</div></div>, size); }
