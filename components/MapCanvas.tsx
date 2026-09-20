"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, TileEvent } from "leaflet";
import type { Mosque, Station } from "@/lib/types";
type Props = { station: Station; mosques: Mosque[]; selectedId: string | null; onSelect: (id: string) => void };
export default function MapCanvas({ station, mosques, selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const selectedRef = useRef(selectedId);
  const [error, setError] = useState(false);
  const [tileError, setTileError] = useState(false);
  const externalMapUrl = "https://www.openstreetmap.org/?mlat=" + station.lat + "&mlon=" + station.lng + "#map=15/" + station.lat + "/" + station.lng;
  useEffect(() => {
    let cancelled = false;
    const markerMap = markers.current;
    let resize: ResizeObserver | undefined;
    import("leaflet").then(L => {
      if (cancelled || !container.current) return;
      // The mobile list switch unmounts this canvas; avoid delayed zoom callbacks
      // trying to access Leaflet panes after they have been removed.
      const canvas = L.map(container.current, { scrollWheelZoom: false, zoomAnimation: false }).setView([station.lat, station.lng], 14);
      map.current = canvas;
      setTileError(false);
      const failedTiles = new Map<HTMLElement, number>();
      const loadedTiles = new Map<HTMLElement, number>();
      const updateTileStatus = () => {
        if (cancelled) return;
        const zoom = Math.round(canvas.getZoom());
        const hasFailed = [...failedTiles.values()].some(tileZoom => tileZoom === zoom);
        const hasLoaded = [...loadedTiles.values()].some(tileZoom => tileZoom === zoom);
        // Leaflet can retain parent tiles from an old zoom as a loading buffer.
        // Only completed tiles at the current zoom determine the current status.
        if (hasFailed) setTileError(true);
        else if (hasLoaded) setTileError(false);
      };
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' });
      tiles.on("tileerror", (event: TileEvent) => {
        loadedTiles.delete(event.tile);
        failedTiles.set(event.tile, event.coords.z);
        updateTileStatus();
      });
      tiles.on("tileload", (event: TileEvent) => {
        failedTiles.delete(event.tile);
        loadedTiles.set(event.tile, event.coords.z);
        // One successful tile must not hide failures elsewhere in the current layer.
        updateTileStatus();
      });
      tiles.on("tileunload", (event: TileEvent) => {
        failedTiles.delete(event.tile);
        loadedTiles.delete(event.tile);
        // Leaflet prunes old failed tiles after new ones load, often in a later frame.
        updateTileStatus();
      });
      canvas.on("zoomend", updateTileStatus);
      tiles.addTo(canvas);
      const stationLabel = document.createElement("span"); stationLabel.textContent = "Stesen " + station.name;
      L.marker([station.lat, station.lng], { icon: L.divIcon({ className: "station-map-pin", html: "S", iconSize: [34, 34], iconAnchor: [17, 17] }), title: "Stesen " + station.name }).addTo(canvas).bindTooltip(stationLabel);
      const points: [number, number][] = [[station.lat, station.lng]];
      markerMap.clear();
      mosques.forEach((mosque, index) => {
        const label = document.createElement("span"); label.textContent = mosque.name;
        const marker = L.marker([mosque.lat, mosque.lng], { icon: L.divIcon({ className: "mosque-map-pin", html: String(index + 1), iconSize: [30, 30], iconAnchor: [15, 15] }), title: mosque.name }).addTo(canvas).bindTooltip(label);
        marker.on("click", () => onSelect(mosque.placeId));
        markerMap.set(mosque.placeId, marker);
        if (mosque.placeId === selectedRef.current) { marker.getElement()?.classList.add("active"); marker.openTooltip(); }
        points.push([mosque.lat, mosque.lng]);
      });
      if (points.length > 1) canvas.fitBounds(points, { padding: [35, 35], maxZoom: 16 });
      resize = new ResizeObserver(() => canvas.invalidateSize()); resize.observe(container.current);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; resize?.disconnect(); map.current?.remove(); map.current = null; markerMap.clear(); };
  }, [station, mosques, onSelect]);
  useEffect(() => {
    selectedRef.current = selectedId;
    markers.current.forEach((marker, id) => {
      marker.getElement()?.classList.toggle("active", id === selectedId);
      if (id === selectedId) { marker.openTooltip(); map.current?.panTo(marker.getLatLng()); }
      else marker.closeTooltip();
    });
  }, [selectedId]);
  if (error) return <div className="map-fallback"><p>Peta tidak dapat dimuatkan.</p><a href={externalMapUrl} target="_blank" rel="noreferrer">Buka OpenStreetMap ↗</a></div>;
  return <><div ref={container} className="map-canvas" role="region" aria-label={"Peta stesen " + station.name + " dan lokasi masjid"} />{tileError ? <div className="inline-error" role="status"><p>Imej peta tidak dapat dimuatkan sepenuhnya. Pin lokasi masih tersedia.</p><a className="text-button" href={externalMapUrl} target="_blank" rel="noreferrer">Buka OpenStreetMap ↗</a></div> : null}</>;
}
