import { NextResponse } from "next/server";
import { isZohoConnected } from "@/lib/zoho-auth";
import * as zoho from "@/lib/zoho-api";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connected = await isZohoConnected();
    if (!connected) {
      return NextResponse.json({ connected: false, data: null });
    }

    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    const bankAccounts = (await zoho.listBankAccounts().catch(() => [])) as Record<string, unknown>[];

    return NextResponse.json({
      connected: true,
      currency: settings?.currency || "CAD",
      accounts: bankAccounts.map((a) => ({
        id: a.account_id,
        name: a.account_name,
        balance: a.balance,
        type: a.account_type,
        bankName: a.bank_name || "",
        accountNumber: a.account_number ? `****${String(a.account_number).slice(-4)}` : "",
        uncategorizedCount: a.uncategorized_transactions || 0,
      })),
    });
  } catch (error) {
    console.error("GET /api/reconciliation/accounts error:", error);
    return NextResponse.json(
      { connected: false, error: error instanceof Error ? error.message : "Failed", data: null },
      { status: 500 }
    );
  }
}
