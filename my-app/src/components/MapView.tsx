"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection, LineString } from "geojson";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
(mapboxgl as unknown as { setTelemetryEnabled?: (enabled: boolean) => void }).setTelemetryEnabled?.(false);
const STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE || "mapbox://styles/stellalynn/cmgzn15a7001a01s9fzfc70dq";
const FALLBACK_STYLE = "mapbox://styles/mapbox/streets-v12";

export type MarkerData = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  place_name?: string;
  category?: string;
};

type Props = {
  center: { lat: number; lng: number };
  markers?: MarkerData[]; // intentionally unused for now
  selectedPoints?: MarkerData[]; // selected locations to mark and route
  height?: number;
};

export default function MapView({ center, markers = [], selectedPoints = [], height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const fallbackAppliedRef = useRef<boolean>(false);
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const selectedMarkersRef = useRef<mapboxgl.Marker[]>([]);

  const ROUTE_SOURCE_ID = "route";
  const ROUTE_LAYER_ID = "route-line";

  useEffect(() => {
    if (!containerRef.current) return;
    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: containerRef.current,
        style: STYLE_URL,
        center: [center.lng, center.lat],
        zoom: 16,
        pitch: 60,
        bearing: -20,
        antialias: true,
      });
      // Surface Mapbox GL errors (e.g., 401/403/blocked requests) for debugging
      mapRef.current.on("error", (e) => {
        const raw = (e as { error?: unknown })?.error ?? e;
        const msg = typeof raw === "string"
          ? raw
          : (typeof raw === "object" && raw && "message" in raw
              ? (raw as { message?: string }).message
              : "") || "";
        const status = (typeof raw === "object" && raw && "status" in raw)
          ? (raw as { status?: number }).status
          : undefined;
        const isStyleError =
          msg.toLowerCase().includes("style") ||
          (typeof raw === "object" && raw && "resourceType" in raw &&
            (raw as { resourceType?: string }).resourceType === "style");
        // eslint-disable-next-line no-console
        console.warn("Mapbox error:", msg || status);
        if (!fallbackAppliedRef.current && (isStyleError || status === 401 || status === 403)) {
          fallbackAppliedRef.current = true;
          try {
            // eslint-disable-next-line no-console
            console.warn("Falling back to default style due to style load error.");
            mapRef.current?.setStyle(FALLBACK_STYLE);
          } catch {}
        }
      });
    } else {
      try {
        const map = mapRef.current;
        const currentZoom = map?.getZoom?.() ?? 16;
        const currentPitch = map?.getPitch?.() ?? 60;
        const currentBearing = map?.getBearing?.() ?? -20;
        mapRef.current.flyTo({
          center: [center.lng, center.lat],
          duration: 800,
          essential: true,
          zoom: Math.max(currentZoom, 16),
          pitch: currentPitch,
          bearing: currentBearing,
        });
      } catch {
        mapRef.current.setCenter([center.lng, center.lat]);
      }
    }

    // Update or create a single, prominent selected marker at the center
    const map = mapRef.current;
    if (map) {
      if (!selectedMarkerRef.current) {
        const el = document.createElement("div");
        el.style.width = "28px";
        el.style.height = "28px";
        el.style.borderRadius = "50%";
        el.style.background = "#ff2ea8"; // vivid pink for strong definition
        el.style.border = "3px solid #fff";
        el.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)";
        selectedMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([center.lng, center.lat])
          .addTo(map);
      } else {
        selectedMarkerRef.current.setLngLat([center.lng, center.lat]);
      }
    }
  }, [center.lat, center.lng]);

  // Ensure route source/layer exists once style is loaded
  const ensureRouteLayer = async (map: mapboxgl.Map) => {
    await new Promise<void>((resolve) => {
      if (map.isStyleLoaded()) return resolve();
      map.once("load", () => resolve());
    });
    if (!map.getSource(ROUTE_SOURCE_ID)) {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }
    if (!map.getLayer(ROUTE_LAYER_ID)) {
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#10b981",
          "line-width": 5,
          "line-opacity": 0.9,
        },
      });
    }
  };

  // Update selected markers and route when selections change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous selected markers
    selectedMarkersRef.current.forEach((m) => {
      try { m.remove(); } catch {}
    });
    selectedMarkersRef.current = [];

    // Add green markers for each selected point
    for (const p of selectedPoints) {
      if (p.lng == null || p.lat == null) continue;
      const el = document.createElement("div");
      el.style.width = "22px";
      el.style.height = "22px";
      el.style.borderRadius = "50%";
      el.style.background = "#22c55e"; // green
      el.style.border = "2px solid #fff";
      el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
      const mk = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
      selectedMarkersRef.current.push(mk);
    }

    const applyStraightPolyline = async () => {
      // Fallback straight line through points
      const coords = selectedPoints.map((p) => [p.lng, p.lat]);
      const data: FeatureCollection = coords.length >= 2
        ? {
            type: "FeatureCollection",
            features: [
              { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} },
            ],
          }
        : { type: "FeatureCollection", features: [] };
      await ensureRouteLayer(map);
      const src = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource;
      src.setData(data);
    };

    const updateRoutedLine = async () => {
      if (selectedPoints.length < 2) {
        await ensureRouteLayer(map);
        const src = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource;
        const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
        src.setData(empty);
        return;
      }
      try {
        await ensureRouteLayer(map);
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
        const coordStr = selectedPoints.map((p) => `${p.lng},${p.lat}`).join(";");
        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coordStr}?overview=full&geometries=geojson&access_token=${token}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("directions failed");
        const json = await res.json();
        const geom = json?.routes?.[0]?.geometry as LineString | undefined;
        if (!geom) throw new Error("no route geometry");
        const data: FeatureCollection = { type: "FeatureCollection", features: [{ type: "Feature", geometry: geom, properties: {} }] };
        const src = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource;
        src.setData(data);
      } catch {
        // Fallback to straight polyline
        await applyStraightPolyline();
      }
    };

    updateRoutedLine();
  }, [selectedPoints.map((p) => p.id).join("|")]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: `${height}px`, borderRadius: 12 }}
    />
  );
}