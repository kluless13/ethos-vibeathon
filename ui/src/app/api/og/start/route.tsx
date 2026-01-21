import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET() {
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
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255, 64, 0, 0.15) 0%, transparent 50%)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "linear-gradient(135deg, #FF4000, #ff6b35)",
            marginBottom: 30,
            boxShadow: "0 0 60px rgba(255, 64, 0, 0.4)",
            color: "white",
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          E
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "white",
              marginBottom: 10,
            }}
          >
            Trust Ring Detector
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#737373",
              marginBottom: 40,
            }}
          >
            Ethos Network Collusion Analysis
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 32px",
            borderRadius: 16,
            border: "2px solid #FF4000",
            color: "#FF4000",
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          Enter a username to check their trust score
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 30,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#525252",
            fontSize: 16,
          }}
        >
          Built for Ethos Vibeathon
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
