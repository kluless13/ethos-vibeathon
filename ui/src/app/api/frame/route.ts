import { NextRequest, NextResponse } from "next/server";

const FRAME_BASE_URL = process.env.NEXT_PUBLIC_FRAME_URL || "https://ethos-trust-frame.vercel.app";

export async function GET() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${FRAME_BASE_URL}/api/og/start" />
        <meta property="fc:frame:input:text" content="Enter X handle (e.g. vitalik)" />
        <meta property="fc:frame:button:1" content="Check Trust Score" />
        <meta property="fc:frame:post_url" content="${FRAME_BASE_URL}/api/frame/check" />
        <meta property="og:title" content="Ethos Trust Ring Detector" />
        <meta property="og:description" content="Check if someone is trustworthy before vouching" />
        <meta property="og:image" content="${FRAME_BASE_URL}/api/og/start" />
      </head>
      <body>
        <h1>Ethos Trust Ring Detector</h1>
        <p>Check profiles for collusion patterns before vouching.</p>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

export async function POST(req: NextRequest) {
  return GET();
}
