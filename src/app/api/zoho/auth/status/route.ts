import { NextResponse } from "next/server";
import { isZohoConnected, disconnectZoho } from "@/lib/zoho-auth";

export async function GET() {
  try {
    const connected = await isZohoConnected();
    return NextResponse.json({ connected });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  try {
    await disconnectZoho();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disconnect" },
      { status: 500 }
    );
  }
}
