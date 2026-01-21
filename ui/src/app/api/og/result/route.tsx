import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username") || "unknown";
  const score = parseInt(searchParams.get("score") || "0");
  const ethosScore = parseInt(searchParams.get("ethos") || "0");
  const riskLevel = searchParams.get("risk") || "minimal";

  // Simple risk color mapping
  const riskColors: Record<string, string> = {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
    low: "#3b82f6",
    minimal: "#22c55e"
  };
  const riskLabels: Record<string, string> = {
    critical: "CRITICAL",
    high: "HIGH RISK",
    medium: "CAUTION",
    low: "LOW RISK",
    minimal: "TRUSTED"
  };

  const color = riskColors[riskLevel] || "#22c55e";
  const label = riskLabels[riskLevel] || "TRUSTED";

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
          padding: 60,
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, color: "white", marginBottom: 20 }}>
          @{username}
        </div>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
          <div style={{
            padding: "12px 24px",
            borderRadius: 16,
            backgroundColor: color,
            color: "white",
            fontSize: 28,
            fontWeight: 700
          }}>
            {label}
          </div>
        </div>

        <div style={{ fontSize: 48, color: color, fontWeight: 700, marginBottom: 20 }}>
          Risk Score: {score}/100
        </div>

        <div style={{ fontSize: 24, color: "#737373" }}>
          Ethos Score: {ethosScore > 0 ? ethosScore : "N/A"}
        </div>

        <div style={{
          position: "absolute",
          bottom: 40,
          display: "flex",
          alignItems: "center",
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: "#FF4000",
            marginRight: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 700,
          }}>E</div>
          <span style={{ color: "#525252", fontSize: 18 }}>Trust Ring Detector</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
