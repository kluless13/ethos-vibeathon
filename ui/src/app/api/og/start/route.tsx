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
          backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255, 64, 0, 0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 120%, rgba(255, 64, 0, 0.15) 0%, transparent 50%)",
          position: "relative",
        }}
      >
        {/* Decorative ring elements */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            height: 500,
            borderRadius: "50%",
            border: "1px solid rgba(255, 64, 0, 0.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            height: 400,
            borderRadius: "50%",
            border: "1px dashed rgba(255, 64, 0, 0.15)",
          }}
        />

        {/* Logo */}
        <img
          src="https://ethos-vibeathon.vercel.app/ringer.png"
          width={120}
          height={120}
          style={{
            marginBottom: 32,
            filter: "drop-shadow(0 0 40px rgba(255, 64, 0, 0.5))",
          }}
        />

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            Ethos Trust Check
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#a3a3a3",
              marginBottom: 48,
            }}
          >
            Check reputation before vouching
          </div>
        </div>

        {/* CTA Button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "20px 48px",
            borderRadius: 16,
            background: "linear-gradient(135deg, #FF4000 0%, #ff6b35 100%)",
            color: "white",
            fontSize: 24,
            fontWeight: 700,
            boxShadow: "0 0 50px rgba(255, 64, 0, 0.4), 0 10px 30px rgba(0, 0, 0, 0.3)",
          }}
        >
          Open Mini App
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#525252",
            fontSize: 18,
          }}
        >
          <span>Built for Ethos Vibeathon</span>
          <span style={{ color: "#FF4000" }}>•</span>
          <span>Powered by ethos-ts-sdk</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
