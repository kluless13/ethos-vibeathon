import { NextRequest, NextResponse } from "next/server";

const FRAME_BASE_URL = process.env.NEXT_PUBLIC_FRAME_URL || "https://ethos-trust-frame.vercel.app";

type Profile = {
  profile_id: number;
  username: string | null;
  display_name: string | null;
  ethos_score: number | null;
  composite_score: number;
  risk_level: string;
  ring_score: number;
  cluster_score: number;
};

// Cache profiles in memory after first load
let profilesCache: Profile[] | null = null;

async function loadProfiles(): Promise<Profile[]> {
  if (profilesCache) return profilesCache;

  // Fetch from public URL (works on Vercel)
  const baseUrl = FRAME_BASE_URL.includes("localhost")
    ? "http://localhost:3000"
    : FRAME_BASE_URL;

  const res = await fetch(`${baseUrl}/data/profiles_full.json`);
  profilesCache = await res.json();
  return profilesCache!;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const inputText = body.untrustedData?.inputText || "";
    const username = inputText.trim().toLowerCase().replace("@", "");

    if (!username) {
      return returnErrorFrame("Please enter a username");
    }

    const profiles = await loadProfiles();
    const profile = profiles.find(
      (p) => p.username?.toLowerCase() === username
    );

    if (!profile) {
      return returnNotFoundFrame(username);
    }

    return returnResultFrame(profile);
  } catch (error) {
    console.error("Frame check error:", error);
    return returnErrorFrame("Something went wrong");
  }
}

function returnResultFrame(profile: Profile) {
  const riskEmoji = profile.composite_score >= 50 ? "🚨" :
                    profile.composite_score >= 30 ? "⚠️" :
                    profile.composite_score >= 10 ? "ℹ️" : "✅";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${FRAME_BASE_URL}/api/og/result?username=${profile.username}&score=${profile.composite_score}&ethos=${profile.ethos_score || 0}&risk=${profile.risk_level}" />
        <meta property="fc:frame:button:1" content="View on Ethos" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="https://app.ethos.network/profile/x/${profile.username}" />
        <meta property="fc:frame:button:2" content="Check Another" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content="${FRAME_BASE_URL}/api/frame" />
        <meta property="og:title" content="${riskEmoji} @${profile.username} - Trust Score" />
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
