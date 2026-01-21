import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username") || "unknown";
  const score = parseInt(searchParams.get("score") || "0");
  const level = searchParams.get("level") || "neutral";
  const vouches = parseInt(searchParams.get("vouches") || "0");
  const eth = searchParams.get("eth") || "0";
  const risk = searchParams.get("risk") || "none";
  const riskScore = parseInt(searchParams.get("riskScore") || "0");

  // Ethos score level colors
  const levelColors: Record<string, { color: string; label: string }> = {
    exemplary: { color: "#22c55e", label: "EXEMPLARY" },
    reputable: { color: "#3b82f6", label: "REPUTABLE" },
    neutral: { color: "#737373", label: "NEUTRAL" },
    questionable: { color: "#f97316", label: "QUESTIONABLE" },
    untrusted: { color: "#ef4444", label: "UNTRUSTED" },
  };

  const levelConfig = levelColors[level] || levelColors.neutral;
  const hasRisk = risk !== "none" && riskScore >= 30;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0a",
          padding: 50,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 30,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: "#FF4000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 22,
                fontWeight: 700,
                marginRight: 12,
              }}
            >
              E
            </div>
            <span style={{ color: "#737373", fontSize: 18 }}>Ethos Trust Check</span>
          </div>

          {/* Score Level Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              borderRadius: 12,
              backgroundColor: `${levelConfig.color}20`,
              border: `2px solid ${levelConfig.color}`,
            }}
          >
            <span style={{ color: levelConfig.color, fontSize: 18, fontWeight: 700 }}>
              {levelConfig.label}
            </span>
          </div>
        </div>

        {/* Username */}
        <div style={{ fontSize: 56, fontWeight: 700, color: "white", marginBottom: 24 }}>
          @{username}
        </div>

        {/* Main Stats Grid */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginBottom: 30,
          }}
        >
          {/* Ethos Score */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: 24,
              borderRadius: 16,
              backgroundColor: "#111",
              border: "1px solid #262626",
              flex: 1,
            }}
          >
            <span style={{ color: "#737373", fontSize: 14, marginBottom: 8 }}>Ethos Score</span>
            <span style={{ color: levelConfig.color, fontSize: 48, fontWeight: 700 }}>{score}</span>
            <span style={{ color: "#525252", fontSize: 12 }}>out of 2800</span>
          </div>

          {/* Vouches */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: 24,
              borderRadius: 16,
              backgroundColor: "#111",
              border: "1px solid #262626",
              flex: 1,
            }}
          >
            <span style={{ color: "#737373", fontSize: 14, marginBottom: 8 }}>Vouches Received</span>
            <span style={{ color: "#3b82f6", fontSize: 48, fontWeight: 700 }}>{vouches}</span>
            <span style={{ color: "#525252", fontSize: 12 }}>people vouched</span>
          </div>

          {/* ETH Staked */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: 24,
              borderRadius: 16,
              backgroundColor: "#111",
              border: "1px solid #262626",
              flex: 1,
            }}
          >
            <span style={{ color: "#737373", fontSize: 14, marginBottom: 8 }}>ETH Staked</span>
            <span style={{ color: "#22c55e", fontSize: 48, fontWeight: 700 }}>{eth}</span>
            <span style={{ color: "#525252", fontSize: 12 }}>ETH committed</span>
          </div>
        </div>

        {/* Trust Ring Warning (if any) */}
        {hasRisk && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px 24px",
              borderRadius: 12,
              backgroundColor: "#ef444420",
              border: "1px solid #ef444450",
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 24, marginRight: 12 }}>⚠️</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#ef4444", fontSize: 16, fontWeight: 600 }}>
                Trust Ring Alert: Possible collusion patterns detected
              </span>
              <span style={{ color: "#ef444490", fontSize: 14 }}>
                Risk score: {riskScore}/100 - Review before vouching
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            paddingTop: 20,
            borderTop: "1px solid #262626",
          }}
        >
          <span style={{ color: "#525252", fontSize: 14 }}>
            Check reputation before vouching on Ethos Network
          </span>
          <span style={{ color: "#FF4000", fontSize: 14, fontWeight: 600 }}>
            ethos.network
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
