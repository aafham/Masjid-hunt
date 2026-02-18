"use client";

import { useMemo, useState } from "react";
import type { Mosque, Station } from "@/lib/types";
import { formatDistance } from "@/lib/utils";

type Props = {
  mosque: Mosque;
  station: Station;
};

export default function MosqueCard({ mosque, station }: Props) {
  const [expandMap, setExpandMap] = useState(false);

  const origin = `${station.lat},${station.lng}`;
  const destination = `${mosque.lat},${mosque.lng}`;

  const directionLink = useMemo(() => {
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    url.searchParams.set("travelmode", "walking");
    return url.toString();
  }, [origin, destination]);

  const embedSrc = `/api/map-embed?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;

  return (
    <article className="space-y-3 rounded-xl border border-brand/20 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-ink">{mosque.name}</h3>
        <p className="mt-1 text-sm font-medium text-brandDark">
          {formatDistance(mosque.distanceMeters)}
          {mosque.durationMinutes ? ` | ${mosque.durationMinutes} min berjalan` : ""}
          {mosque.distanceType === "haversine_estimate" ? " | anggaran" : ""}
        </p>
        <p className="mt-1 text-sm text-slate-600">{mosque.address || "Alamat tidak tersedia"}</p>
      </div>

      <a
        href={directionLink}
        target="_blank"
        rel="noreferrer"
        className="inline-flex rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brandDark"
      >
        Directions
      </a>

      <div>
        <button
          type="button"
          onClick={() => setExpandMap((value) => !value)}
          className="mb-2 text-sm font-medium text-brandDark underline"
        >
          {expandMap ? "Sembunyikan map preview" : "Papar map preview"}
        </button>

        {expandMap ? (
          <div className="overflow-hidden rounded-lg border border-brand/15">
            <iframe
              src={embedSrc}
              className="h-[200px] w-full"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title={`Route dari ${station.name} ke ${mosque.name}`}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
