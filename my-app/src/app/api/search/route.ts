import { NextResponse } from "next/server";

type Place = {
  id: string;
  name: string;
  place_name: string;
  category: string;
  lat?: number;
  lng?: number;
};

const CATEGORY_QUERIES: Record<string, string> = {
  sightseeing: "tourist attraction",
  lunch: "restaurant",
  dessert: "dessert",
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

    const token = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "MAPBOX_TOKEN/NEXT_PUBLIC_MAPBOX_TOKEN is not set" },
        { status: 500 }
      );
    }

    const queries = activities.length
      ? activities.map((a) => CATEGORY_QUERIES[a] || a)
      : Object.values(CATEGORY_QUERIES);

    const results: Place[] = [];

    for (const q of queries) {
      const query = encodeURIComponent(q);
      const bboxParam = bbox && bbox.length === 4 ? `&bbox=${bbox.join(",")}` : "";
      const countryParam = country ? `&country=${encodeURIComponent(country)}` : "";
      const url = `https://api.mapbox.com/search/searchbox/v1/forward?q=${query}&proximity=${lng},${lat}${countryParam}${bboxParam}&types=poi&limit=5&access_token=${token}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      for (const f of data.features || []) {
        const coords = f?.geometry?.coordinates || [];
        const flng = Array.isArray(coords) ? coords[0] : undefined;
        const flat = Array.isArray(coords) ? coords[1] : undefined;
        const props = f?.properties || {};
        results.push({
          id: props.mapbox_id || f.id,
          name: props.name || f.text || "",
          place_name: props.full_address || f.place_name || "",
          category: q,
          lat: flat,
          lng: flng,
        });
      }
    }

    return NextResponse.json({ places: results });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}