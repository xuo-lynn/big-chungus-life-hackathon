import { NextResponse } from "next/server";

type Place = {
  id: string;
  name: string;
  place_name: string;
  category: string;
  lat?: number;
  lng?: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lat: number | undefined = body?.lat;
    const lng: number | undefined = body?.lng;
    const activities: string[] = Array.isArray(body?.activities)
      ? body.activities
      : [];
    const country: string | undefined =
      typeof body?.country === "string" ? body.country : undefined;
    const bbox: number[] | undefined = Array.isArray(body?.bbox)
      ? body.bbox
      : undefined;

    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      return NextResponse.json(
        { error: "Invalid or missing lat/lng" },
        { status: 400 }
      );
    }

    const token =
      process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "MAPBOX_TOKEN/NEXT_PUBLIC_MAPBOX_TOKEN is not set" },
        { status: 500 }
      );
    }

    const queries =
      activities.length > 0 ? activities : ["restaurant", "cafe", "attraction"];

    const results: Place[] = [];
    const seenIds = new Set<string>(); // Track IDs to avoid duplicates

    for (const q of queries) {
      const query = encodeURIComponent(q);

      // Build the search URL with proximity as the main parameter
      // Remove bbox and country filters to get more results
      const url = `https://api.mapbox.com/search/searchbox/v1/forward?q=${query}&proximity=${lng},${lat}&types=poi&limit=5&access_token=${token}`;

      console.log(`🔍 Searching: "${q}" near [${lat}, ${lng}]`);

      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Search failed for "${q}":`, res.status);
        continue;
      }

      const data = await res.json();
      console.log(`📍 Found ${data.features?.length || 0} results for "${q}"`);

      for (const f of data.features || []) {
        const coords = f?.geometry?.coordinates || [];
        const flng = Array.isArray(coords) ? coords[0] : undefined;
        const flat = Array.isArray(coords) ? coords[1] : undefined;
        const props = f?.properties || {};
        const placeId = props.mapbox_id || f.id;

        // Skip if we've already added this place
        if (seenIds.has(placeId)) {
          continue;
        }

        seenIds.add(placeId);
        results.push({
          id: placeId,
          name: props.name || f.text || "",
          place_name: props.full_address || f.place_name || "",
          category: q,
          lat: flat,
          lng: flng,
        });
      }
    }

    console.log(`✅ Total unique places found: ${results.length}`);
    return NextResponse.json({ places: results });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
