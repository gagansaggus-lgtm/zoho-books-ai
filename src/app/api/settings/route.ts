import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/settings-helper";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: "default" },
      });
    }

    // Check if API key is configured via DB or env var
    const hasApiKey = !!(settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY);
    const apiKeySource = settings.anthropicApiKey ? "database" : process.env.ANTHROPIC_API_KEY ? "environment" : "none";

    return NextResponse.json({
      ...settings,
      anthropicApiKey: hasApiKey ? "sk-ant-...configured" : "",
      apiKeySource,
      appBaseUrl: getAppBaseUrl(),
      redirectUri: `${getAppBaseUrl()}/api/zoho/auth`,
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.zohoOrgId !== undefined) data.zohoOrgId = body.zohoOrgId;
    if (body.anthropicApiKey !== undefined && !body.anthropicApiKey.includes("...configured")) {
      data.anthropicApiKey = body.anthropicApiKey;
    }
    if (body.aiModel !== undefined) data.aiModel = body.aiModel;
    if (body.aiTemperature !== undefined) data.aiTemperature = body.aiTemperature;
    if (body.cacheMinutes !== undefined) data.cacheMinutes = body.cacheMinutes;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.fiscalYearStart !== undefined) data.fiscalYearStart = body.fiscalYearStart;

    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });

    const hasApiKey = !!(settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY);

    return NextResponse.json({
      ...settings,
      anthropicApiKey: hasApiKey ? "sk-ant-...configured" : "",
      appBaseUrl: getAppBaseUrl(),
      redirectUri: `${getAppBaseUrl()}/api/zoho/auth`,
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
