"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Send } from "lucide-react";
import "./page.css";

export default function Home() {
  const [location, setLocation] = useState("");
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ location, prompt });
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
                <label className="text-sm text-gray-600">
                  Enter your location
                </label>
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
                placeholder="e.g., sightseeing, lunch, dessert"
                className="input mt-2"
              />

              <div className="flex justify-center">
                <button type="submit" className="button">
                  Generate Plan <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
