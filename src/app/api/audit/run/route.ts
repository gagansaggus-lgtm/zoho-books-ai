import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runFullAudit } from "@/lib/audit-engine";
import { isZohoConnected } from "@/lib/zoho-auth";
import { getAnthropicApiKey, getAiModel } from "@/lib/settings-helper";

export async function POST() {
  try {
    const apiKey = await getAnthropicApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured." },
        { status: 400 }
      );
    }

    const zohoConnected = await isZohoConnected();
    if (!zohoConnected) {
      return NextResponse.json(
        { error: "Zoho Books not connected. Please connect via Settings." },
        { status: 400 }
      );
    }

    const aiModel = await getAiModel();

    // Clear previous findings before running new audit
    await prisma.auditFinding.deleteMany({});

    // Run the full audit
    const findings = await runFullAudit(apiKey, aiModel);

    const summary = {
      totalFindings: findings.length,
      critical: findings.filter((f) => f.severity === "critical").length,
      warning: findings.filter((f) => f.severity === "warning").length,
      info: findings.filter((f) => f.severity === "info").length,
    };

    return NextResponse.json({ success: true, summary, findings });
  } catch (error) {
    console.error("Audit run error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Audit failed" },
      { status: 500 }
    );
  }
}
