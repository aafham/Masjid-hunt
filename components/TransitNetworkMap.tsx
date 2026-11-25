"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Maximize, TrainFront } from "lucide-react";
import type { Map as LeafletMap, TileEvent } from "leaflet";
import { getNetworkLines, getStationConnections } from "@/lib/network";
import type { Station } from "@/lib/types";
import LineBadge from "@/components/LineBadge";
import "./TransitNetworkMap.css";

type MapState = { map: LeafletMap; leaflet: typeof import("leaflet") };

function fitStations(map: LeafletMap, stations: Station[]) {
  if (stations.length) {
    map.fitBounds(stations.map(s => [s.lat, s.lng]), {
      padding: [24, 24], maxZoom: 15, animate: false
    });
  }
}

export default function TransitNetworkMap({ stations }: { stations: Station[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [base, setBase] = useState<MapState | null>(null);
  const [mapError, setMapError] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [selection, setSelection] = useState({ id: "", fromPin: false });
  const stationLink = useRef<HTMLAnchorElement>(null);
  const selected = stations.find(station => station.id === selection.id);
  const connections = selected ? getStationConnections(selected.id) : [];
  const visible = useMemo(() => {
    const ids = new Set(stations.map(station => station.id));
    return getNetworkLines().map(line => ({
      ...line, stops: line.stations.filter(station => ids.has(station.id))
    })).filter(line => line.stops.length > 0);
  }, [stations]);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | undefined;
    let resize: ResizeObserver | undefined;
    import("leaflet").then(leaflet => {
      if (cancelled || !container.current) return;
      const canvas = leaflet.map(container.current, {
        scrollWheelZoom: false, zoomAnimation: false, zoomControl: false
      }).setView([3.1, 101.65], 10);
      map = canvas;
      const updatePinSize = () => canvas.getContainer().classList.toggle("network-overview", canvas.getZoom() < 12);
      updatePinSize();
      canvas.on("zoomend", updatePinSize);
      leaflet.control.zoom({ zoomInTitle: "Zum masuk", zoomOutTitle: "Zum keluar" }).addTo(canvas);
      const tiles = leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      });
      const failures = new Map<HTMLElement, number>();
      const updateTileError = () => {
        if (!cancelled) setTileError([...failures.values()].includes(canvas.getZoom()));
      };
      tiles.on("tileerror", (event: TileEvent) => {
        failures.set(event.tile, event.coords.z);
        updateTileError();
      });
      const clearFailure = (event: TileEvent) => {
        if (failures.delete(event.tile)) updateTileError();
      };
      tiles.on("tileload", clearFailure);
      tiles.on("tileunload", clearFailure);
      canvas.on("zoomend", updateTileError);
      tiles.addTo(canvas);
      resize = new ResizeObserver(() => canvas.invalidateSize());
      resize.observe(container.current);
      setBase({ map: canvas, leaflet });
    }).catch(() => { if (!cancelled) setMapError(true); });

    return () => {
      cancelled = true;
      resize?.disconnect();
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (!base) return;
    const { leaflet, map } = base;
    const layer = leaflet.layerGroup().addTo(map);
    const markers = new Map<string, { station: Station; colors: string[] }>();

    for (const line of visible) {
      leaflet.polyline(line.path, {
        color: line.color, weight: 4, opacity: 0.9, interactive: false,
        dashArray: line.pathSource === "schematic" ? "6 5" : undefined
      }).addTo(layer);
      for (const station of line.stops) {
        const key = station.lat + "," + station.lng;
        const existing = markers.get(key);
        if (existing) existing.colors.push(line.color);
        else markers.set(key, { station, colors: [line.color] });
      }
    }

    // A nearby marker's touch target can overlap the visible dot under the finger.
    const selectNearestPin = (event: { originalEvent: MouseEvent }) => {
      const tap = map.mouseEventToContainerPoint(event.originalEvent);
      let closest: Station | undefined;
      let distance = Infinity;
      for (const { station } of markers.values()) {
        const center = map.latLngToContainerPoint([station.lat, station.lng]);
        const pixels = center.distanceTo(tap);
        if (pixels < distance) {
          distance = pixels;
          closest = station;
        }
      }
      if (closest) setSelection({ id: closest.id, fromPin: true });
    };

    for (const { station, colors } of markers.values()) {
      const dot = document.createElement("span");
      dot.style.borderColor = colors.length > 1 ? "#173f35" : colors[0];
      if (colors.length > 1) dot.className = "shared-stop";
      const label = document.createElement("span");
      label.textContent = station.name;
      leaflet.marker([station.lat, station.lng], {
        title: station.name, keyboard: false,
        icon: leaflet.divIcon({ className: "network-station-pin", html: dot, iconSize: [22, 22], iconAnchor: [11, 11] })
      }).addTo(layer).bindTooltip(label, { direction: "top" }).on("click", selectNearestPin);
    }

    fitStations(map, stations);
    return () => { layer.remove(); };
  }, [base, stations, visible]);

  useEffect(() => {
    if (!base || !selected) return;
    const point: [number, number] = [selected.lat, selected.lng];
    base.map.setView(point, Math.max(base.map.getZoom(), 14), { animate: false });
    const halo = base.leaflet.circleMarker(point, {
      radius: 14, weight: 3, color: "#173f35", fillColor: "#fff", fillOpacity: 0.45,
      interactive: false
    }).addTo(base.map);
    return () => { halo.remove(); };
  }, [base, selected, visible]);

  useEffect(() => {
    if (selection.fromPin && window.matchMedia("(max-width: 767px)").matches) {
      stationLink.current?.scrollIntoView({ block: "nearest" });
    }
  }, [selection]);

  return <section id="peta-rangkaian" className="network-explorer" aria-labelledby="network-title">
    <div className="network-heading">
      <h2 id="network-title">Laluan dan stesen</h2>
      <button type="button" className="network-fit" aria-label="Zum ke semua hasil" title="Zum ke semua hasil" disabled={!base || mapError} onClick={() => {
        if (base) { setSelection({ id: "", fromPin: false }); fitStations(base.map, stations); }
      }}><Maximize size={15} aria-hidden /> Zum semula</button>
    </div>
    <div className="network-body">
      <div className="network-map-frame">
        <div ref={container} className="network-canvas" role="region" aria-label="Peta stesen transit Lembah Klang" />
        {(!base || mapError) && <p role="status" className="network-map-status">{mapError ? "Peta tidak dapat dibuka. Pilih stesen melalui senarai." : "Memuatkan peta rangkaian…"}</p>}
        {tileError && <p role="status" className="network-map-status">Imej peta dasar tidak dapat dimuatkan. Garisan dan pin stesen masih tersedia.</p>}
      </div>
      <div className="network-station-details">
        <label htmlFor="network-station">Pilih stesen pada peta</label>
        <select id="network-station" value={selected?.id ?? ""} onChange={event => setSelection({ id: event.target.value, fromPin: false })}>
          <option value="">Pilih stesen…</option>
          {visible.map(line => <optgroup key={line.id} label={line.name}>
            {line.stops.map(stop => <option key={stop.id} value={stop.id}>{stop.name}{stop.station_code ? " · " + stop.station_code : ""}</option>)}
          </optgroup>)}
        </select>
        {selected ? <div className="network-stop" aria-live="polite">
          <h3>{selected.name}</h3>
          <LineBadge station={selected} />
          <Link ref={stationLink} className="button-primary" href={"/station/" + selected.id}>Cari masjid berhampiran <ArrowRight size={16} aria-hidden /></Link>
          {connections.length > 0 && <div className="network-connections"><h4>Sambungan stesen</h4><ul>
            {connections.map(stop => <li key={stop.id}><Link href={"/station/" + stop.id}>{stop.line_name}{stop.name !== selected.name ? " · " + stop.name : ""}<ArrowRight size={14} aria-hidden /></Link></li>)}
          </ul></div>}
        </div> : <div className="network-prompt">
          <TrainFront size={23} aria-hidden />
          <p>Tekan pin atau pilih stesen untuk melihat pertukaran laluan dan masjid berhampiran.</p>
        </div>}
      </div>
    </div>
    <ul className="network-legend" aria-label="Petunjuk laluan">
      {visible.map(line => <li key={line.id}><span aria-hidden style={{ borderColor: line.color, borderTopStyle: line.pathSource === "schematic" ? "dashed" : "solid" }} />{line.name}</li>)}
    </ul>
    {visible.some(line => line.pathSource === "schematic") && <p className="network-caption">Garisan putus-putus menghubungkan stesen mengikut turutan perkhidmatan. Jajaran landasan sebenar mungkin berbeza.</p>}
  </section>;
}
