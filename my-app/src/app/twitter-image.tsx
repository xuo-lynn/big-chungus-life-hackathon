import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "daydream.ai";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(1200px 630px at 50% 50%, #e9fbff 0%, #d9f6ff 35%, #c9f1ff 55%, #a8e8ff 85%)",
          color: "#0b2e3b",
          letterSpacing: -1,
        }}
      >
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            marginBottom: 16,
          }}
        >
          daydream.ai
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            opacity: 0.85,
          }}
        >
          Cute planner for meaningful local adventures
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}