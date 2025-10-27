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
  const [analyzedActivities, setAnalyzedActivities] = useState<string[]>([]);

  // Selection state: track checked IDs and preserve selection order
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setAnalyzedActivities([]);

    try {
      // 1) Geocode location AND parse prompt with Gemini (all in one call)
      console.log("🔍 Step 1: Geocoding...", { location, prompt });
      const geoRes = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, prompt }),
      });
      const geo = await geoRes.json();
      console.log("📍 Geocode response:", geo);

      if (!geoRes.ok) throw new Error(geo?.error || "Geocoding failed");

      const center = { lat: geo.lat as number, lng: geo.lng as number };
      setCoords(center);

      // Get activities from geocode response (already parsed by Gemini)
      const activities = geo.activities || [
        "restaurant",
        "cafe",
        "tourist attraction",
      ];
      console.log("🎯 Using activities:", activities);
      setAnalyzedActivities(activities);

      // 2) Search places by AI-generated categories near the location
      console.log("🔎 Step 2: Searching places...", {
        lat: center.lat,
        lng: center.lng,
        activities,
        country: geo.countryCode,
        bbox: geo.bbox,
      });
      const searchRes = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: center.lat,
          lng: center.lng,
          activities,
          country: geo.countryCode,
          bbox: geo.bbox,
        }),
      });
      const search = await searchRes.json();
      console.log("📌 Search response:", search);

      if (!searchRes.ok)
        throw new Error(search?.error || "Place search failed");

      console.log("✅ Found places:", search.places?.length || 0);
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
          Describe your ideal day and location — we'll curate a personalized
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
                <label className="text-sm text-gray-600">
                  Enter your location
                </label>
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Chinatown, New York"
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
                placeholder="e.g., I wanna go biking and then get dessert with my friend"
                className="input mt-2"
              />

              {error && (
                <p className="text-sm" style={{ color: "#d28fd0" }}>
                  {error}
                </p>
              )}

              {analyzedActivities.length > 0 && (
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">Searching for:</p>
                  <div className="flex flex-wrap gap-2">
                    {analyzedActivities.map((activity, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-purple-100 rounded-full text-xs"
                      >
                        {activity}
                      </span>
                    ))}
                  </div>
                </div>
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
            <MapView
              center={coords}
              markers={places}
              selectedPoints={selectedPoints}
            />
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
