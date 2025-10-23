"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Send } from "lucide-react";
import "./page.css";
import MapView, { MarkerData } from "@/src/components/MapView";
import PlacesCarousel from "@/src/components/PlacesCarousel";

export default function Home() {
  const [location, setLocation] = useState("");
  const [prompt, setPrompt] = useState("");

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [places, setPlaces] = useState<MarkerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state: track checked IDs and preserve selection order
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1) Geocode location to lat/lng
      const geoRes = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });
      const geo = await geoRes.json();
      if (!geoRes.ok) throw new Error(geo?.error || "Geocoding failed");

      const center = { lat: geo.lat as number, lng: geo.lng as number };
      setCoords(center);

      // 2) Hard-coded activities for MVP
      const activities = ["sightseeing", "lunch", "dessert"];

      // 3) Search places by categories near the location
      const searchRes = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: center.lat, lng: center.lng, activities }),
      });
      const search = await searchRes.json();
      if (!searchRes.ok)
        throw new Error(search?.error || "Place search failed");

      setPlaces(search.places || []);
      // reset selections when new places arrive
      setSelectedIds(new Set());
      setSelectedOrder([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedPoints: MarkerData[] = selectedOrder
    .map((id) => places.find((p) => p.id === id))
    .filter(Boolean) as MarkerData[];

  const handleFocusPlace = (item: MarkerData) => {
    setCoords({ lat: item.lat, lng: item.lng });
  };

  const handleToggleSelect = (item: MarkerData) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
    setSelectedOrder((prev) => {
      const exists = prev.includes(item.id);
      if (exists) return prev.filter((id) => id !== item.id);
      return [...prev, item.id];
    });
  };

  const handleResetSelections = () => {
    setSelectedIds(new Set());
    setSelectedOrder([]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="hero-section"
      >
        <h1 className="hero-title">Plan Your Perfect Day</h1>
        <p className="hero-description">
          Describe your ideal day and location — we’ll curate a personalized
          itinerary just for you.
        </p>
      </motion.div>

      {/* Input Card */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        <div className="card">
          <div className="card-content">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-sm text-gray-600">Enter your location</label>
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., New York City"
                className="input mt-2"
              />

              <div>
                <label className="text-sm text-gray-600">
                  What kind of day would you like?
                </label>
              </div>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., sightseeing, lunch, dessert (MVP uses a preset)"
                className="input mt-2"
              />

              {error && (
                <p className="text-sm" style={{ color: "#d28fd0" }}>
                  {error}
                </p>
              )}

              <div className="flex justify-center">
                <button type="submit" className="button" disabled={loading}>
                  {loading ? "Generating…" : "Generate Plan"} <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>

      {/* Map + Results */}
      {coords && (
        <>
          <div className="w-full max-w-5xl mt-10">
            <MapView center={coords} markers={places} selectedPoints={selectedPoints} />
          </div>

          <div className="mt-8 w-full">
            <div className="flex items-center justify-between">
              <p className="card-text">Suggested stops near your location</p>
              <button
                type="button"
                onClick={handleResetSelections}
                className="rounded-full bg-white/80 hover:bg-white shadow px-3 py-1 border text-sm"
              >
                Reset selections
              </button>
            </div>
            <PlacesCarousel
              items={places}
              onFocus={handleFocusPlace}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          </div>
        </>
      )}
    </div>
  );
}
