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
    const prompt: string | undefined = body?.prompt;

    if (!location || typeof location !== "string") {
      return NextResponse.json(
        { error: "Missing 'location' in request body" },
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

    // 1) Geocode the location
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
    const ctx: ContextItem[] = Array.isArray(feature?.context)
      ? (feature.context as ContextItem[])
      : [];
    let countryCode: string | undefined = undefined;
    for (const c of ctx) {
      // Look for country-level context (not state/region)
      const sc =
        c?.short_code ||
        c?.country_code ||
        c?.iso_3166_1_alpha_2 ||
        c?.iso_3166_1_alpha_3;
      if (sc) {
        const code = String(sc).toUpperCase();
        // Only use 2-letter country codes (e.g., "US"), not state codes (e.g., "US-NY")
        if (code.length === 2) {
          countryCode = code;
          break;
        }
      }
    }

    // Bbox is [minLng, minLat, maxLng, maxLat] when available
    const bbox = Array.isArray(feature?.bbox) ? feature.bbox : undefined;

    // 2) Parse the prompt with Gemini (if provided)
    let activities: string[] = ["coffee shop", "restaurant", "park", "museum", "bookstore", "artisan market"];

    if (prompt && prompt.trim()) {
      const googleApiKey = process.env.GOOGLE_API_KEY;
      console.log("🔑 GOOGLE_API_KEY exists:", !!googleApiKey);
      console.log("📝 User prompt:", prompt);

      if (googleApiKey) {
        try {
          const systemPrompt = `You are a map search query builder. From the user's request, produce 4–8 succinct queries that mix general place types with optional local/community qualifiers.

Rules:
- Return ONLY a JSON array of strings
- Each string should be 2–4 words and a searchable map query
- Favor widely understood categories (e.g., "coffee shop", "park", "museum", "restaurant"), and optionally add local/community qualifiers when helpful (e.g., "local cafe", "artisan market", "community center")
- Include location modifiers (neighborhood/city) if mentioned: e.g., "coffee shop chinatown", "museum brooklyn"
- Avoid overly niche phrases; keep queries useful and generic enough for search
- No explanations, just the array

Examples:
"i wanna do a community event and support local businesses" → ["community center", "farmers market", "coffee shop", "restaurant", "artisan market", "bookstore"]
"small businesses in chinatown" → ["local cafe chinatown", "bakery chinatown", "bookstore chinatown", "gift shop chinatown"]
"museum then lunch" → ["museum", "art gallery", "restaurant", "lunch"]
"coffee shop in brooklyn then pizza" → ["coffee shop brooklyn", "cafe brooklyn", "pizza", "pizzeria"]

Request: "${prompt}"

JSON array:`;

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${googleApiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: systemPrompt,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 200,
                },
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
              try {
                // Remove markdown code blocks and extra whitespace
                const cleaned = text
                  .replace(/```json\n?/g, "")
                  .replace(/```\n?/g, "")
                  .replace(/^[^[]*/, "") // Remove text before first [
                  .replace(/[^\]]*$/, "") // Remove text after last ]
                  .trim();

                const parsed = JSON.parse(cleaned);

                if (Array.isArray(parsed) && parsed.length > 0) {
                  const parsedArray: unknown[] = Array.isArray(parsed) ? parsed : [];
                  activities = parsedArray
                    .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
                    .slice(0, 6);

                  console.log("✅ Gemini parsed activities:", activities);
                }
              } catch (parseError) {
                console.error("Failed to parse Gemini response:", text);
              }
            }
          } else {
            console.error(
              "Gemini API error:",
              geminiRes.status,
              await geminiRes.text()
            );
          }
        } catch (geminiError) {
          console.error("Gemini request failed:", geminiError);
        }
      } else {
        console.log("⚠️ GOOGLE_API_KEY not set, using default activities");
      }
    }

    return NextResponse.json({
      lat,
      lng,
      place_name: feature.place_name,
      countryCode,
      bbox,
      activities, // Include parsed activities in response
    });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}