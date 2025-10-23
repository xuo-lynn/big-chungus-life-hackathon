import { NextResponse } from "next/server";

type Detail = {
  image_url: string | null;
  rating: number | null;
  review_count: number | null;
  phone: string | null;
  website: string | null;
  categories?: string[] | undefined;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.slice(0, 20) : [];

    if (!ids.length) {
      return NextResponse.json({ details: {} });
    }

    const token = process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "MAPBOX_TOKEN/NEXT_PUBLIC_MAPBOX_TOKEN is not set" },
        { status: 500 }
      );
    }

    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_CLIENT_ID;
    const details: Record<string, Detail> = {};

    for (const id of ids) {
      try {
        const url = `https://api.mapbox.com/search/searchbox/v1/retrieve?mapbox_id=${encodeURIComponent(id)}&access_token=${token}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const f = data?.features?.[0];
        const props = f?.properties || {};

        let image_url: string | null = props?.image_url || props?.photo_url || null;
        const name: string | undefined = props?.name || f?.text || undefined;
        const fullAddress: string | undefined = props?.full_address || f?.place_name || undefined;
        const categories: string[] | undefined = props?.category_labels || props?.categories || undefined;

        // If Mapbox didn't provide an image, try Unsplash as a fallback
        if (!image_url && unsplashKey && name) {
          // Build a query using name + city/country + category
          const where = (fullAddress || "").split(",").slice(-2).join(" ").trim();
          const category = Array.isArray(categories) ? categories[0] : "";
          const q = [name, where, category].filter(Boolean).join(" ");
          try {
            const u = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&client_id=${unsplashKey}&orientation=landscape&content_filter=high&per_page=1`;
            const ur = await fetch(u);
            if (ur.ok) {
              const uj = await ur.json();
              const first = (uj?.results || [])[0];
              image_url = first?.urls?.regular || first?.urls?.small || null;
            }
          } catch {}
        }

        details[id] = {
          image_url: image_url,
          rating: props?.rating ?? null,
          review_count: props?.review_count ?? null,
          phone: props?.phone ?? null,
          website: props?.website ?? null,
          categories,
        };
      } catch {}
    }

    return NextResponse.json({ details });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}