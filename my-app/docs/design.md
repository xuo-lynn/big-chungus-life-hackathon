# Itinerary Planner — Design Document

## Overview
Smart web app that creates personalized date plans given a location and a natural‑language prompt. It combines natural language processing with routing/place APIs to return multiple curated location suggestions and routes, and displays them on an interactive map.

## Features
- Natural-language prompt input (e.g., "I want dinner, a walk, and dessert")
- Smart place suggestions based on activity categories
- Optimized route generation between stops
- Interactive map visualization

## Tech Stack
- Frontend/Backend: Next.js (React + TypeScript + Tailwind). Also handles API routing.
- Map & Location API: Mapbox (via `mapbox-gl` + `@mapbox/mapbox-sdk`), handles routing.
- NLP: OpenAI API (or simple keyword matcher as a fallback).
- Deployment: Vercel.

## Design Flow
1. Empty text input screen → user enters location → Geocoding API converts to lat/lng.
2. Store lat/lng in state and center Mapbox map to given location.
3. Show prompt bar: "What type of day would you like?"
4. Example input: "I’d like to go sightseeing, lunch, and maybe a sweet treat."
5. NLP (OpenAI) extracts activities → `["sightseeing", "lunch", "dessert"]`.
6. Link activities to search categories → sightseeing → attractions; lunch → restaurants; dessert → cafe/bakery.
7. Mapbox Search API (places endpoint) finds top-rated locations near the user’s location per category.
8. Selected locations are passed to Mapbox Directions API → returns GeoJSON route connecting stops.
9. Mapbox map renders the route from the GeoJSON; markers show each stop.

## Mapbox Components
- Map container (`new mapboxgl.Map`) — main interactive map.
- GeoJSON source (`map.addSource`) — stores route/point data.
- Line layer (`map.addLayer`) — displays the route GeoJSON.
- Markers (`new mapboxgl.Marker`) — points that can be hovered for info.
- Popups (`new mapboxgl.Popup`) — additional info when hovering a marker.
- Directions API — get route between each location.
- Geocoding API — converts user-entered location to coordinates.
- Search API (part of geocoding) — searches for recommended locations.

## Initial UI Aesthetic (Home)
- Soft pink gradient background with glassy card.
- Two inputs: location and "What kind of day would you like?" prompt.
- CTA button: "Generate Plan" with subtle gradient.
- Animated entrance using Framer Motion.

## Implementation Notes (Current Repo)
- Next.js App Router (`src/app`) with Tailwind v4 via PostCSS plugin.
- `src/app/page.tsx` implements the home screen with controlled inputs and a submit handler (currently logs to console).
- Styling primarily in `src/app/page.css` for the gradient/card aesthetic; global Tailwind is imported via `globals.css`.
- Future steps: integrate Mapbox and OpenAI APIs, add results page with map and itinerary list, and wire form submission to backend routes.