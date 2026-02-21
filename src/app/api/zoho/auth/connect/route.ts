import { NextRequest, NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/zoho-auth";
import { getAppBaseUrl } from "@/lib/settings-helper";
import prisma from "@/lib/prisma";

// Initiate OAuth flow
export async function POST(request: NextRequest) {
  try {
    const { clientId, clientSecret } = await request.json();

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Client ID and Client Secret are required" },
        { status: 400 }
      );
    }

    // Store credentials temporarily for the callback
    await prisma.zohoTokens.upsert({
      where: { id: "default" },
      update: { clientId, clientSecret },
      create: {
        id: "default",
        accessToken: "",
        refreshToken: "",
        expiresAt: new Date(),
        clientId,
        clientSecret,
      },
    });

    const redirectUri = `${getAppBaseUrl()}/api/zoho/auth`;
    const authUrl = getAuthorizationUrl(clientId, redirectUri);

    return NextResponse.json({ authUrl, redirectUri });
  } catch (error) {
    console.error("Connect error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate connection" },
      { status: 500 }
    );
  }
}
