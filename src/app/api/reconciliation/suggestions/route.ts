import { NextRequest, NextResponse } from "next/server";
import { isZohoConnected } from "@/lib/zoho-auth";
import { getReconciliationSuggestions } from "@/lib/categorization-engine";
import { getAnthropicApiKey, getAiModel } from "@/lib/settings-helper";

export async function POST(request: NextRequest) {
  try {
    const { bankAccountId } = await request.json();

    const apiKey = await getAnthropicApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured." },
        { status: 400 }
      );
    }

    const connected = await isZohoConnected();
    if (!connected) {
      return NextResponse.json(
        { error: "Zoho Books not connected. Please connect via Settings." },
        { status: 400 }
      );
    }

    if (!bankAccountId) {
      return NextResponse.json(
        { error: "bankAccountId is required" },
        { status: 400 }
      );
    }

    const aiModel = await getAiModel();
    const suggestions = await getReconciliationSuggestions(
      bankAccountId,
      apiKey,
      aiModel
    );

    return NextResponse.json({
      bankAccountId,
      suggestions,
      totalSuggestions: suggestions.length,
      highConfidence: suggestions.filter((s) => s.confidence >= 0.9).length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/reconciliation/suggestions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
