import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const total = await prisma.conversation.count();

    return NextResponse.json({
      conversations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/chat/history error:", error);
    return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 });
  }
}
