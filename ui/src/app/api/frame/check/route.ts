import { NextRequest, NextResponse } from "next/server";
import { getEthosProfile } from "@/lib/ethos";

const FRAME_BASE_URL = process.env.NEXT_PUBLIC_FRAME_URL || "https://ethos-vibeathon.vercel.app";

type TrustRingProfile = {
  profile_id: number;
  username: string | null;
  composite_score: number;
  risk_level: string;
};

// Cache Trust Ring data in memory
let trustRingCache: TrustRingProfile[] | null = null;

async function loadTrustRingData(): Promise<TrustRingProfile[]> {
  if (trustRingCache) return trustRingCache;

  try {
    const res = await fetch(`${FRAME_BASE_URL}/data/profiles_full.json`);
    trustRingCache = await res.json();
    return trustRingCache!;
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inputText = body.untrustedData?.inputText || "";
    const username = inputText.trim().toLowerCase().replace("@", "");

    if (!username) {
      return returnErrorFrame("Please enter a username");
    }

    // Fetch from Ethos API
    const ethosProfile = await getEthosProfile(username);

    if (!ethosProfile) {
      return returnNotFoundFrame(username);
    }

    // Get Trust Ring data if available
    const trustRingData = await loadTrustRingData();
    const trustRingProfile = trustRingData.find(
      (p) => p.username?.toLowerCase() === username || p.profile_id === ethosProfile.id
    );

    return returnResultFrame(ethosProfile, trustRingProfile);
  } catch (error) {
    console.error("Frame check error:", error);
    return returnErrorFrame("Something went wrong");
  }
}

function returnResultFrame(
  ethos: {
    id: number;
    username?: string;
    displayName?: string;
    score: number;
    scoreLevel: string;
    vouchesReceived: number;
    ethStaked: number
  },
  trustRing?: TrustRingProfile
) {
  const hasRisk = trustRing && trustRing.composite_score >= 30;
  const riskLevel = trustRing?.risk_level || "minimal";

  // Build image URL with all data
  const imageParams = new URLSearchParams({
    username: ethos.username || "unknown",
    score: ethos.score.toString(),
    level: ethos.scoreLevel,
    vouches: ethos.vouchesReceived.toString(),
    eth: ethos.ethStaked.toFixed(2),
    risk: hasRisk ? riskLevel : "none",
    riskScore: trustRing?.composite_score?.toString() || "0",
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${FRAME_BASE_URL}/api/og/result?${imageParams}" />
        <meta property="fc:frame:button:1" content="View on Ethos" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="https://app.ethos.network/profile/x/${ethos.username}" />
        <meta property="fc:frame:button:2" content="Check Another" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content="${FRAME_BASE_URL}/api/frame" />
        <meta property="og:title" content="@${ethos.username} - Ethos Score: ${ethos.score}" />
      </head>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

function returnNotFoundFrame(username: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${FRAME_BASE_URL}/api/og/notfound?username=${username}" />
        <meta property="fc:frame:input:text" content="Try another username" />
        <meta property="fc:frame:button:1" content="Search Again" />
        <meta property="fc:frame:post_url" content="${FRAME_BASE_URL}/api/frame/check" />
      </head>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

function returnErrorFrame(message: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${FRAME_BASE_URL}/api/og/error?message=${encodeURIComponent(message)}" />
        <meta property="fc:frame:input:text" content="Enter X handle" />
        <meta property="fc:frame:button:1" content="Try Again" />
        <meta property="fc:frame:post_url" content="${FRAME_BASE_URL}/api/frame/check" />
      </head>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
