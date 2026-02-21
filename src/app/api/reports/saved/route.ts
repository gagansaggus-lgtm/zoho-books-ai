import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("reportType");

    const where = reportType ? { reportType } : {};

    const reports = await prisma.savedReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("GET /api/reports/saved error:", error);
    return NextResponse.json({ error: "Failed to fetch saved reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const report = await prisma.savedReport.create({
      data: {
        title: body.title,
        reportType: body.reportType,
        dateRange: body.dateRange || "",
        content: body.content,
        summary: body.summary || body.content.substring(0, 200),
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("POST /api/reports/saved error:", error);
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}
