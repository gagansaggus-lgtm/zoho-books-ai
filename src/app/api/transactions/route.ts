import { NextRequest, NextResponse } from "next/server";
import { isZohoConnected } from "@/lib/zoho-auth";
import * as zoho from "@/lib/zoho-api";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const connected = await isZohoConnected();
    if (!connected) {
      return NextResponse.json({ connected: false, data: null });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId") || "";
    const type = searchParams.get("type") || "all"; // all, invoices, bills, expenses, bank
    const status = searchParams.get("status") || "";

    const settings = await prisma.settings.findUnique({ where: { id: "default" } });

    // Fetch data based on type
    let transactions: Record<string, unknown>[] = [];

    if (type === "all" || type === "invoices") {
      const invoices = (await zoho.listInvoices(status ? { status } : {}).catch(() => [])) as Record<string, unknown>[];
      transactions.push(
        ...invoices.map((inv) => ({
          id: inv.invoice_id,
          type: "invoice",
          date: inv.date,
          description: `Invoice ${inv.invoice_number} - ${inv.customer_name}`,
          reference: inv.invoice_number,
          amount: inv.total,
          balance: inv.balance,
          status: inv.status,
          contactName: inv.customer_name,
          accountName: "Accounts Receivable",
          direction: "inflow" as const,
        }))
      );
    }

    if (type === "all" || type === "bills") {
      const bills = (await zoho.listBills(status ? { status } : {}).catch(() => [])) as Record<string, unknown>[];
      transactions.push(
        ...bills.map((bill) => ({
          id: bill.bill_id,
          type: "bill",
          date: bill.date,
          description: `Bill ${bill.bill_number} - ${bill.vendor_name}`,
          reference: bill.bill_number,
          amount: bill.total,
          balance: bill.balance,
          status: bill.status,
          contactName: bill.vendor_name,
          accountName: "Accounts Payable",
          direction: "outflow" as const,
        }))
      );
    }

    if (type === "all" || type === "expenses") {
      const expenses = (await zoho.listExpenses().catch(() => [])) as Record<string, unknown>[];
      transactions.push(
        ...expenses.map((exp) => ({
          id: exp.expense_id,
          type: "expense",
          date: exp.date,
          description: `${exp.description || exp.account_name || "Expense"} - ${exp.vendor_name || "Unknown"}`,
          reference: exp.reference_number || exp.expense_id,
          amount: exp.total,
          balance: 0,
          status: exp.status || "recorded",
          contactName: exp.vendor_name || "",
          accountName: exp.account_name || "Uncategorized",
          direction: "outflow" as const,
        }))
      );
    }

    if (type === "bank" && accountId) {
      const bankTxns = (await zoho.listBankTransactions(accountId).catch(() => [])) as Record<string, unknown>[];
      transactions = bankTxns.map((txn) => ({
        id: txn.transaction_id,
        type: "bank_transaction",
        date: txn.date,
        description: txn.description || txn.payee || "Bank Transaction",
        reference: txn.reference_number || "",
        amount: txn.amount,
        balance: 0,
        status: txn.status || "categorized",
        contactName: txn.payee || "",
        accountName: txn.account_name || "",
        direction: (txn.debit_or_credit === "credit" ? "inflow" : "outflow") as "inflow" | "outflow",
      }));
    }

    // Sort by date descending
    transactions.sort((a, b) => {
      const dateA = new Date(a.date as string).getTime();
      const dateB = new Date(b.date as string).getTime();
      return dateB - dateA;
    });

    // Get flagged transactions
    const flagged = await prisma.flaggedTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Get bank accounts for the dropdown
    const bankAccounts = (await zoho.listBankAccounts().catch(() => [])) as Record<string, unknown>[];

    // Calculate summary
    const inflows = transactions.filter((t) => t.direction === "inflow");
    const outflows = transactions.filter((t) => t.direction === "outflow");
    const totalInflow = inflows.reduce((s, t) => s + ((t.amount as number) || 0), 0);
    const totalOutflow = outflows.reduce((s, t) => s + ((t.amount as number) || 0), 0);

    return NextResponse.json({
      connected: true,
      currency: settings?.currency || "CAD",
      data: {
        transactions: transactions.slice(0, 100), // limit to 100 most recent
        totalCount: transactions.length,
        summary: {
          totalInflow,
          totalOutflow,
          net: totalInflow - totalOutflow,
          inflowCount: inflows.length,
          outflowCount: outflows.length,
        },
        flagged: flagged.map((f) => ({
          id: f.id,
          transactionId: f.zohoTransId,
          reason: f.flagReason,
          severity: f.severity,
          resolved: f.status === "resolved",
        })),
        bankAccounts: bankAccounts.map((a) => ({
          id: a.account_id,
          name: a.account_name,
          balance: a.balance,
          type: a.account_type,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json(
      { connected: false, error: error instanceof Error ? error.message : "Failed to fetch", data: null },
      { status: 500 }
    );
  }
}
