import { NextResponse } from "next/server";

type ContextItem = {
  short_code?: string;
  country_code?: string;
  iso_3166_1_alpha_2?: string;
  iso_3166_1_alpha_3?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const location: string | undefined = body?.location;

    if (!location || typeof location !== "string") {
      return NextResponse.json(
        { error: "Missing 'location' in request body" },
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

    const query = encodeURIComponent(location);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?limit=1&access_token=${token}`;

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Mapbox geocoding request failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) {
      return NextResponse.json(
        { error: "No matching location found" },
        { status: 404 }
      );
    }

    const [lng, lat] = feature.center;

    // Try to extract ISO country code from the feature context
    const ctx: ContextItem[] = Array.isArray(feature?.context) ? (feature.context as ContextItem[]) : [];
    let countryCode: string | undefined = undefined;
    for (const c of ctx) {
      const sc = (c?.short_code || c?.country_code || c?.iso_3166_1_alpha_2 || c?.iso_3166_1_alpha_3);
      if (sc) {
        countryCode = String(sc).toUpperCase();
        break;
      }
    }

    // Bbox is [minLng, minLat, maxLng, maxLat] when available
    const bbox = Array.isArray(feature?.bbox) ? feature.bbox : undefined;

    return NextResponse.json({
      lat,
      lng,
      place_name: feature.place_name,
      countryCode,
      bbox,
    });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}