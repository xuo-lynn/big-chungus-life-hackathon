import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "daydream.ai";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
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
          background: "radial-gradient(1200px 630px at 50% 50%, #ffe8f2 0%, #ffd6ea 35%, #ffc2e1 55%, #ff9fd1 85%)",
          color: "#3b0b2e",
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