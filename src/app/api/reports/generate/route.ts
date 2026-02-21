import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { chatWithClaude } from "@/lib/claude";
import { REPORT_PROMPTS } from "@/lib/prompts";
import { isZohoConnected } from "@/lib/zoho-auth";
import { getAnthropicApiKey } from "@/lib/settings-helper";
import * as zoho from "@/lib/zoho-api";

export async function POST(request: NextRequest) {
  try {
    const { reportType, dateRange, options } = await request.json();

    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    const apiKey = await getAnthropicApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured. Please set it in Settings or ANTHROPIC_API_KEY env var." },
        { status: 400 }
      );
    }

    const connected = await isZohoConnected();
    const currency = settings.currency || "CAD";

    // Fetch real data from Zoho if connected
    let financialData = "";
    if (connected) {
      try {
        const dataFetches: Record<string, Promise<unknown>> = {};

        // Decide what data to fetch based on report type
        if (reportType === "pnl" || reportType === "cashflow" || reportType === "custom") {
          dataFetches.invoices = zoho.listInvoices({}, true).catch(() => []);
          dataFetches.bills = zoho.listBills({}, true).catch(() => []);
          dataFetches.expenses = zoho.listExpenses({}, true).catch(() => []);
        }
        if (reportType === "expense" || reportType === "custom") {
          dataFetches.expenses = dataFetches.expenses || zoho.listExpenses({}, true).catch(() => []);
          dataFetches.bills = dataFetches.bills || zoho.listBills({}, true).catch(() => []);
        }
        if (reportType === "aging") {
          dataFetches.invoices = dataFetches.invoices || zoho.listInvoices({}, true).catch(() => []);
        }
        if (reportType === "vendor") {
          dataFetches.bills = dataFetches.bills || zoho.listBills({}, true).catch(() => []);
          dataFetches.expenses = dataFetches.expenses || zoho.listExpenses({}, true).catch(() => []);
          dataFetches.contacts = zoho.listContacts({}, true).catch(() => []);
        }
        if (reportType === "cashflow") {
          dataFetches.bankAccounts = zoho.listBankAccounts({}, true).catch(() => []);
          dataFetches.customerPayments = zoho.listCustomerPayments({}, true).catch(() => []);
          dataFetches.vendorPayments = zoho.listVendorPayments({}, true).catch(() => []);
        }

        // Resolve all fetches
        const results: Record<string, unknown> = {};
        const entries = Object.entries(dataFetches);
        const values = await Promise.all(entries.map(([, p]) => p));
        entries.forEach(([key], i) => {
          results[key] = values[i];
        });

        // Filter by date range if provided
        const filterByDate = (items: Record<string, unknown>[], dateField = "date") => {
          if (!dateRange?.start && !dateRange?.end) return items;
          return items.filter((item) => {
            const d = item[dateField] as string;
            if (!d) return true;
            if (dateRange.start && d < dateRange.start) return false;
            if (dateRange.end && d > dateRange.end) return false;
            return true;
          });
        };

        // Build financial data summary
        const parts: string[] = [];
        parts.push(`Currency: ${currency}`);
        parts.push(`Report Period: ${dateRange?.start || "all time"} to ${dateRange?.end || "present"}`);
        parts.push("");

        if (results.invoices) {
          const invoices = filterByDate(results.invoices as Record<string, unknown>[]);
          const totalRevenue = invoices.reduce((s, i) => s + ((i.total as number) || 0), 0);
          const paidInvoices = invoices.filter((i) => i.status === "paid");
          const unpaidInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "void" && i.status !== "draft");
          const overdueInvoices = invoices.filter((i) => i.status === "overdue");

          parts.push(`=== INVOICES (${invoices.length} total) ===`);
          parts.push(`Total Revenue: $${totalRevenue.toLocaleString()}`);
          parts.push(`Paid: ${paidInvoices.length} ($${paidInvoices.reduce((s, i) => s + ((i.total as number) || 0), 0).toLocaleString()})`);
          parts.push(`Unpaid: ${unpaidInvoices.length} ($${unpaidInvoices.reduce((s, i) => s + ((i.balance as number) || 0), 0).toLocaleString()} outstanding)`);
          parts.push(`Overdue: ${overdueInvoices.length} ($${overdueInvoices.reduce((s, i) => s + ((i.balance as number) || 0), 0).toLocaleString()})`);

          // Top customers
          const customerTotals = new Map<string, number>();
          invoices.forEach((inv) => {
            const name = (inv.customer_name as string) || "Unknown";
            customerTotals.set(name, (customerTotals.get(name) || 0) + ((inv.total as number) || 0));
          });
          const topCustomers = Array.from(customerTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
          if (topCustomers.length > 0) {
            parts.push("\nTop Customers by Revenue:");
            topCustomers.forEach(([name, total], i) => {
              parts.push(`  ${i + 1}. ${name}: $${total.toLocaleString()}`);
            });
          }

          // Aging analysis for aging report
          if (reportType === "aging") {
            const now = new Date();
            const aging = { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDays: 0, overNinety: 0 };
            const agingCounts = { current: 0, thirtyDays: 0, sixtyDays: 0, ninetyDays: 0, overNinety: 0 };

            unpaidInvoices.forEach((inv) => {
              const dueDate = new Date(inv.due_date as string);
              const daysPast = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              const balance = (inv.balance as number) || 0;

              if (daysPast <= 0) { aging.current += balance; agingCounts.current++; }
              else if (daysPast <= 30) { aging.thirtyDays += balance; agingCounts.thirtyDays++; }
              else if (daysPast <= 60) { aging.sixtyDays += balance; agingCounts.sixtyDays++; }
              else if (daysPast <= 90) { aging.ninetyDays += balance; agingCounts.ninetyDays++; }
              else { aging.overNinety += balance; agingCounts.overNinety++; }
            });

            parts.push("\n=== AGING ANALYSIS ===");
            parts.push(`Current (not yet due): $${aging.current.toLocaleString()} (${agingCounts.current} invoices)`);
            parts.push(`1-30 days: $${aging.thirtyDays.toLocaleString()} (${agingCounts.thirtyDays} invoices)`);
            parts.push(`31-60 days: $${aging.sixtyDays.toLocaleString()} (${agingCounts.sixtyDays} invoices)`);
            parts.push(`61-90 days: $${aging.ninetyDays.toLocaleString()} (${agingCounts.ninetyDays} invoices)`);
            parts.push(`Over 90 days: $${aging.overNinety.toLocaleString()} (${agingCounts.overNinety} invoices)`);
          }
          parts.push("");
        }

        if (results.expenses) {
          const expenses = filterByDate(results.expenses as Record<string, unknown>[]);
          const totalExpenses = expenses.reduce((s, e) => s + ((e.total as number) || 0), 0);

          parts.push(`=== EXPENSES (${expenses.length} total) ===`);
          parts.push(`Total Expenses: $${totalExpenses.toLocaleString()}`);

          // By category
          const categoryTotals = new Map<string, number>();
          expenses.forEach((exp) => {
            const cat = (exp.account_name as string) || "Uncategorized";
            categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + ((exp.total as number) || 0));
          });
          const topCategories = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1]);
          if (topCategories.length > 0) {
            parts.push("\nExpenses by Category:");
            topCategories.forEach(([name, total]) => {
              const pct = totalExpenses > 0 ? ((total / totalExpenses) * 100).toFixed(1) : "0";
              parts.push(`  - ${name}: $${total.toLocaleString()} (${pct}%)`);
            });
          }
          parts.push("");
        }

        if (results.bills) {
          const bills = filterByDate(results.bills as Record<string, unknown>[]);
          const totalBills = bills.reduce((s, b) => s + ((b.total as number) || 0), 0);

          parts.push(`=== BILLS (${bills.length} total) ===`);
          parts.push(`Total Bills: $${totalBills.toLocaleString()}`);

          if (reportType === "vendor") {
            const vendorTotals = new Map<string, { total: number; count: number; paid: number }>();
            bills.forEach((bill) => {
              const name = (bill.vendor_name as string) || "Unknown";
              const existing = vendorTotals.get(name) || { total: 0, count: 0, paid: 0 };
              existing.total += (bill.total as number) || 0;
              existing.count += 1;
              if (bill.status === "paid") existing.paid += 1;
              vendorTotals.set(name, existing);
            });
            const topVendors = Array.from(vendorTotals.entries()).sort((a, b) => b[1].total - a[1].total).slice(0, 15);
            if (topVendors.length > 0) {
              parts.push("\nTop Vendors:");
              topVendors.forEach(([name, data], i) => {
                parts.push(`  ${i + 1}. ${name}: $${data.total.toLocaleString()} (${data.count} bills, ${data.paid} paid)`);
              });
            }
          }
          parts.push("");
        }

        if (results.customerPayments) {
          const payments = filterByDate(results.customerPayments as Record<string, unknown>[]);
          const totalReceived = payments.reduce((s, p) => s + ((p.amount as number) || 0), 0);
          parts.push(`=== CUSTOMER PAYMENTS ===`);
          parts.push(`Total Received: $${totalReceived.toLocaleString()} (${payments.length} payments)`);
          parts.push("");
        }

        if (results.vendorPayments) {
          const payments = filterByDate(results.vendorPayments as Record<string, unknown>[]);
          const totalPaid = payments.reduce((s, p) => s + ((p.amount as number) || 0), 0);
          parts.push(`=== VENDOR PAYMENTS ===`);
          parts.push(`Total Paid Out: $${totalPaid.toLocaleString()} (${payments.length} payments)`);
          parts.push("");
        }

        if (results.bankAccounts) {
          const accts = results.bankAccounts as Record<string, unknown>[];
          const totalCash = accts.reduce((s, a) => s + ((a.balance as number) || 0), 0);
          parts.push(`=== BANK ACCOUNTS ===`);
          parts.push(`Total Cash: $${totalCash.toLocaleString()}`);
          accts.forEach((a) => {
            parts.push(`  - ${a.account_name}: $${((a.balance as number) || 0).toLocaleString()}`);
          });
          parts.push("");
        }

        financialData = parts.join("\n");
      } catch (fetchError) {
        console.error("Error fetching Zoho data for report:", fetchError);
        financialData = "Note: Could not fetch live data from Zoho Books. Generating template report.";
      }
    }

    const reportPrompt = REPORT_PROMPTS[reportType] || REPORT_PROMPTS.pnl;
    const detailLevel = options?.detailLevel || "detailed";

    const systemPrompt = `You are a professional financial analyst and bookkeeper for Transway Group, a Canadian trucking company.
Generate thorough, professional financial reports based on the REAL financial data provided.
${connected ? "You have access to LIVE data from Zoho Books." : "No live data available - generate a template report."}

IMPORTANT:
- Use the actual numbers provided in the data
- Format all currency as ${currency} with $ symbol and thousands separators
- Use markdown tables where appropriate
- Include executive summary, key metrics, detailed analysis, and recommendations
- Highlight concerning trends or anomalies
- Be specific with numbers - never use placeholder values when real data is provided
- Include percentage calculations and comparisons where relevant`;

    const userMessage = `Generate a ${reportType.toUpperCase()} report for Transway Group.
Period: ${dateRange?.start || "all time"} to ${dateRange?.end || "present"}
Detail level: ${detailLevel}

${reportPrompt}

${financialData ? `\n\nREAL FINANCIAL DATA FROM ZOHO BOOKS:\n${financialData}` : "\nNo live data available. Please generate a comprehensive template report."}`;

    const response = await chatWithClaude({
      apiKey,
      model: settings?.aiModel || "claude-sonnet-4-20250514",
      temperature: 0.3,
      systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 4096,
    });

    const reportContent = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    // Save the report
    const savedReport = await prisma.savedReport.create({
      data: {
        title: `${reportType.toUpperCase()} Report - ${dateRange?.start || "Current"} to ${dateRange?.end || "Current"}`,
        reportType,
        dateRange: `${dateRange?.start || ""} to ${dateRange?.end || ""}`,
        content: reportContent,
        summary: reportContent.substring(0, 200),
      },
    });

    return NextResponse.json({
      id: savedReport.id,
      title: savedReport.title,
      reportType,
      content: reportContent,
      liveData: connected,
      createdAt: savedReport.createdAt,
    });
  } catch (error) {
    console.error("POST /api/reports/generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report" },
      { status: 500 }
    );
  }
}
