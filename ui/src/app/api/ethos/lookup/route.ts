import { NextRequest, NextResponse } from "next/server";
import { getEthosProfile } from "@/lib/ethos";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.trim().toLowerCase().replace("@", "");

  if (!username) {
    return NextResponse.json(
      { success: false, error: "Username required" },
      { status: 400 }
    );
  }

  try {
    const profile = await getEthosProfile(username);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found on Ethos" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        username: profile.username,
        score: profile.score,
        scoreLevel: profile.scoreLevel,
        vouchesReceived: profile.vouchesReceived,
        ethStaked: profile.ethStaked,
      },
    });
  } catch (error) {
    console.error("Ethos lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
