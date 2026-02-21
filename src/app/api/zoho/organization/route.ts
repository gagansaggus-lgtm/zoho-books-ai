import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let orgId = searchParams.get("orgId");

    if (!orgId) {
      const settings = await prisma.settings.findUnique({ where: { id: "default" } });
      orgId = settings?.zohoOrgId || "";
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Zoho Organization ID not configured. Please set it in Settings." },
        { status: 400 }
      );
    }

    // Return the org ID for MCP tool calls
    // The actual Zoho data is fetched via MCP connectors from the frontend
    return NextResponse.json({
      organization_id: orgId,
      message: "Organization ID configured. Use MCP tools to fetch details.",
    });
  } catch (error) {
    console.error("GET /api/zoho/organization error:", error);
    return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 });
  }
}
