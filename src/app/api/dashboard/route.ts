import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isZohoConnected } from "@/lib/zoho-auth";
import * as zoho from "@/lib/zoho-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    const connected = await isZohoConnected();

    if (!connected || !settings?.zohoOrgId) {
      return NextResponse.json({
        connected: false,
        data: null,
      });
    }

    // Fetch key data in parallel
    const [
      invoicesRaw,
      billsRaw,
      expensesRaw,
      bankAccountsRaw,
      auditFindings,
    ] = await Promise.all([
      zoho.listInvoices({}, true).catch(() => []),
      zoho.listBills({}, true).catch(() => []),
      zoho.listExpenses({}, true).catch(() => []),
      zoho.listBankAccounts({}, true).catch(() => []),
      prisma.auditFinding.findMany({ where: { status: "open" }, take: 5, orderBy: { severity: "asc" } }).catch(() => []),
    ]);

    const invoices = (invoicesRaw || []) as Record<string, unknown>[];
    const bills = (billsRaw || []) as Record<string, unknown>[];
    const expenses = (expensesRaw || []) as Record<string, unknown>[];
    const bankAccounts = (bankAccountsRaw || []) as Record<string, unknown>[];

    // Calculate metrics
    const totalRevenue = invoices.reduce((sum, inv) => sum + ((inv.total as number) || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + ((exp.total as number) || 0), 0);
    const billsTotal = bills.reduce((sum, b) => sum + ((b.total as number) || 0), 0);
    const outstanding = invoices
      .filter((inv) => inv.status === "sent" || inv.status === "overdue" || inv.status === "partially_paid")
      .reduce((sum, inv) => sum + ((inv.balance as number) || 0), 0);
    const overdueInvoices = invoices.filter((inv) => inv.status === "overdue");
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + ((inv.balance as number) || 0), 0);
    const cashInBank = bankAccounts.reduce((sum, acct) => sum + ((acct.balance as number) || 0), 0);

    // Recent invoices (latest 5)
    const recentInvoices = invoices
      .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime())
      .slice(0, 5)
      .map((inv) => ({
        id: inv.invoice_id,
        number: inv.invoice_number,
        customer: inv.customer_name,
        amount: inv.total,
        balance: inv.balance,
        status: inv.status,
        date: inv.date,
        dueDate: inv.due_date,
      }));

    // Recent expenses (latest 5)
    const recentExpenses = expenses
      .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime())
      .slice(0, 5)
      .map((exp) => ({
        id: exp.expense_id,
        account: exp.account_name,
        vendor: exp.vendor_name,
        amount: exp.total,
        date: exp.date,
        status: exp.status,
      }));

    return NextResponse.json({
      connected: true,
      currency: settings.currency || "CAD",
      data: {
        metrics: {
          totalRevenue,
          totalExpenses: totalExpenses + billsTotal,
          netProfit: totalRevenue - totalExpenses - billsTotal,
          outstanding,
          overdueAmount,
          overdueCount: overdueInvoices.length,
          cashInBank,
        },
        recentInvoices,
        recentExpenses,
        bankAccounts: bankAccounts.map((a) => ({
          id: a.account_id,
          name: a.account_name,
          balance: a.balance,
          type: a.account_type,
        })),
        auditFindings: auditFindings.map((f) => ({
          id: f.id,
          title: f.title,
          severity: f.severity,
          type: f.findingType,
        })),
        counts: {
          invoices: invoices.length,
          bills: bills.length,
          expenses: expenses.length,
          bankAccounts: bankAccounts.length,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json(
      { connected: false, error: error instanceof Error ? error.message : "Failed to fetch", data: null },
      { status: 500 }
    );
  }
}
