import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { chatWithClaude } from "@/lib/claude";
import { getAnthropicApiKey } from "@/lib/settings-helper";

export async function POST(request: NextRequest) {
  try {
    const { analysisType, data, question } = await request.json();

    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    const apiKey = await getAnthropicApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a financial analysis AI. Analyze the provided financial data and give clear, actionable insights.
Focus on:
- Key metrics and trends
- Anomalies or concerns
- Actionable recommendations
Format your response in clean markdown.`;

    const userMessage = `Analysis type: ${analysisType || "general"}

${question || "Please analyze the following financial data:"}

${data ? JSON.stringify(data, null, 2) : "No specific data provided. Please provide general guidance for this type of analysis."}`;

    const response = await chatWithClaude({
      apiKey,
      model: settings?.aiModel || "claude-sonnet-4-20250514",
      temperature: 0.3,
      systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 2048,
    });

    const analysis = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    return NextResponse.json({ analysis, analysisType });
  } catch (error) {
    console.error("POST /api/analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze data" },
      { status: 500 }
    );
  }
}
