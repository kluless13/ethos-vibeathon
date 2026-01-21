import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const message = searchParams.get("message") || "Something went wrong";

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
          backgroundColor: "#0a0a0a",
        }}
      >
        {/* Icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 60,
            background: "rgba(239, 68, 68, 0.1)",
            marginBottom: 30,
          }}
        >
          <span style={{ fontSize: 60 }}>⚠️</span>
        </div>

        {/* Message */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "white",
            marginBottom: 16,
          }}
        >
          Oops!
        </div>

        <div
          style={{
            fontSize: 28,
            color: "#ef4444",
            marginBottom: 40,
          }}
        >
          {message}
        </div>

        {/* Suggestion */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 32px",
            borderRadius: 16,
            border: "2px solid #404040",
            color: "#a3a3a3",
            fontSize: 20,
          }}
        >
          Please try again
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #FF4000, #ff6b35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
          </div>
          <span style={{ color: "#525252", fontSize: 16 }}>Trust Ring Detector</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
