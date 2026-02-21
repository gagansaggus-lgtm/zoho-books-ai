import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/zoho-auth";
import { getAppBaseUrl } from "@/lib/settings-helper";
import prisma from "@/lib/prisma";

// OAuth callback handler - Zoho redirects here after user authorizes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    const baseUrl = getAppBaseUrl();

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(error)}`, baseUrl)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?error=No authorization code received", baseUrl)
      );
    }

    // Get stored client credentials from settings
    const tokens = await prisma.zohoTokens.findUnique({ where: { id: "default" } });
    const clientId = tokens?.clientId || process.env.ZOHO_CLIENT_ID || "";
    const clientSecret = tokens?.clientSecret || process.env.ZOHO_CLIENT_SECRET || "";

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/settings?error=Client ID and Secret not configured", baseUrl)
      );
    }

    const redirectUri = `${baseUrl}/api/zoho/auth`;

    await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);

    return NextResponse.redirect(
      new URL("/settings?success=Zoho Books connected successfully!", baseUrl)
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(error instanceof Error ? error.message : "OAuth failed")}`, getAppBaseUrl())
    );
  }
}
