import { NextRequest, NextResponse } from "next/server";
import { getAuditFindings, resolveAuditFinding } from "@/lib/audit-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity") || undefined;
    const status = searchParams.get("status") || undefined;
    const findingType = searchParams.get("findingType") || undefined;

    const findings = await getAuditFindings({ severity, status, findingType });

    const summary = {
      total: findings.length,
      critical: findings.filter((f) => f.severity === "critical").length,
      warning: findings.filter((f) => f.severity === "warning").length,
      info: findings.filter((f) => f.severity === "info").length,
      open: findings.filter((f) => f.status === "open").length,
      resolved: findings.filter((f) => f.status === "resolved").length,
    };

    return NextResponse.json({ findings, summary });
  } catch (error) {
    console.error("Audit results error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch audit results" },
      { status: 500 }
    );
  }
}

// Resolve a finding
export async function PUT(request: NextRequest) {
  try {
    const { findingId, resolution } = await request.json();

    if (!findingId || !resolution) {
      return NextResponse.json(
        { error: "findingId and resolution are required" },
        { status: 400 }
      );
    }

    const updated = await resolveAuditFinding(findingId, resolution);
    return NextResponse.json({ success: true, finding: updated });
  } catch (error) {
    console.error("Resolve finding error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve finding" },
      { status: 500 }
    );
  }
}
