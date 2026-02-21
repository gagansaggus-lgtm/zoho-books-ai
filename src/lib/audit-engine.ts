import * as zoho from "@/lib/zoho-api";
import prisma from "@/lib/prisma";
import { chatWithClaude } from "@/lib/claude";

interface AuditResult {
  findingType: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  amount: number;
}

interface AuditProgress {
  phase: string;
  progress: number;
  total: number;
  message: string;
}

type ProgressCallback = (progress: AuditProgress) => void;

export async function runFullAudit(
  apiKey: string,
  model: string,
  onProgress?: ProgressCallback
): Promise<AuditResult[]> {
  const findings: AuditResult[] = [];

  // Phase 1: Pull all data
  onProgress?.({ phase: "data", progress: 0, total: 8, message: "Fetching invoices..." });
  const invoices = await zoho.listInvoices({}, true);

  onProgress?.({ phase: "data", progress: 1, total: 8, message: "Fetching bills..." });
  const bills = await zoho.listBills({}, true);

  onProgress?.({ phase: "data", progress: 2, total: 8, message: "Fetching expenses..." });
  const expenses = await zoho.listExpenses({}, true);

  onProgress?.({ phase: "data", progress: 3, total: 8, message: "Fetching contacts..." });
  const contacts = await zoho.listContacts({}, true);

  onProgress?.({ phase: "data", progress: 4, total: 8, message: "Fetching customer payments..." });
  const customerPayments = await zoho.listCustomerPayments({}, true);

  onProgress?.({ phase: "data", progress: 5, total: 8, message: "Fetching vendor payments..." });
  const vendorPayments = await zoho.listVendorPayments({}, true);

  onProgress?.({ phase: "data", progress: 6, total: 8, message: "Fetching chart of accounts..." });
  const chartOfAccounts = await zoho.listChartOfAccounts({}, true);

  onProgress?.({ phase: "data", progress: 7, total: 8, message: "Fetching bank accounts..." });
  const bankAccounts = await zoho.listBankAccounts({}, true);

  onProgress?.({ phase: "data", progress: 8, total: 8, message: "All data fetched." });

  // Phase 2: Run structural checks (no AI needed)
  onProgress?.({ phase: "analysis", progress: 0, total: 5, message: "Checking for overdue invoices..." });
  findings.push(...checkOverdueInvoices(invoices as Record<string, unknown>[]));

  onProgress?.({ phase: "analysis", progress: 1, total: 5, message: "Checking for duplicate entries..." });
  findings.push(...checkDuplicates(invoices as Record<string, unknown>[], bills as Record<string, unknown>[]));

  onProgress?.({ phase: "analysis", progress: 2, total: 5, message: "Checking payment mismatches..." });
  findings.push(...checkPaymentMismatches(
    invoices as Record<string, unknown>[],
    customerPayments as Record<string, unknown>[]
  ));

  onProgress?.({ phase: "analysis", progress: 3, total: 5, message: "Checking unusual amounts..." });
  findings.push(...checkUnusualAmounts(expenses as Record<string, unknown>[]));

  onProgress?.({ phase: "analysis", progress: 4, total: 5, message: "Checking uncategorized items..." });
  findings.push(...checkUncategorized(expenses as Record<string, unknown>[]));

  // Phase 3: AI deep analysis
  onProgress?.({ phase: "ai", progress: 0, total: 1, message: "Running AI deep analysis..." });
  const aiFindings = await runAIAnalysis(apiKey, model, {
    invoiceCount: (invoices as unknown[]).length,
    billCount: (bills as unknown[]).length,
    expenseCount: (expenses as unknown[]).length,
    contactCount: (contacts as unknown[]).length,
    invoices: (invoices as Record<string, unknown>[]).slice(0, 100),
    bills: (bills as Record<string, unknown>[]).slice(0, 100),
    expenses: (expenses as Record<string, unknown>[]).slice(0, 100),
    customerPayments: (customerPayments as Record<string, unknown>[]).slice(0, 50),
    vendorPayments: (vendorPayments as Record<string, unknown>[]).slice(0, 50),
    chartOfAccounts,
    bankAccounts,
    structuralFindings: findings,
  });
  findings.push(...aiFindings);
  onProgress?.({ phase: "ai", progress: 1, total: 1, message: "AI analysis complete." });

  // Phase 4: Save findings to database
  onProgress?.({ phase: "save", progress: 0, total: 1, message: "Saving findings..." });
  for (const finding of findings) {
    await prisma.auditFinding.create({
      data: {
        findingType: finding.findingType,
        severity: finding.severity,
        title: finding.title,
        description: finding.description,
        entityType: finding.entityType,
        entityId: finding.entityId,
        amount: finding.amount,
        status: "open",
      },
    });
  }
  onProgress?.({ phase: "save", progress: 1, total: 1, message: "Audit complete!" });

  return findings;
}

// ============ Structural Checks ============

function checkOverdueInvoices(invoices: Record<string, unknown>[]): AuditResult[] {
  const findings: AuditResult[] = [];
  const now = new Date();

  for (const inv of invoices) {
    if (inv.status === "overdue" || inv.status === "partially_paid") {
      const dueDate = new Date(inv.due_date as string);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue > 90) {
        findings.push({
          findingType: "overdue_invoice",
          severity: "critical",
          title: `Invoice ${inv.invoice_number} is ${daysOverdue} days overdue`,
          description: `Invoice #${inv.invoice_number} for ${inv.customer_name} totaling $${inv.total} has been overdue for ${daysOverdue} days. Balance due: $${inv.balance}.`,
          entityType: "invoice",
          entityId: inv.invoice_id as string,
          amount: (inv.balance as number) || 0,
        });
      } else if (daysOverdue > 30) {
        findings.push({
          findingType: "overdue_invoice",
          severity: "warning",
          title: `Invoice ${inv.invoice_number} is ${daysOverdue} days overdue`,
          description: `Invoice #${inv.invoice_number} for ${inv.customer_name} totaling $${inv.total} has been overdue for ${daysOverdue} days.`,
          entityType: "invoice",
          entityId: inv.invoice_id as string,
          amount: (inv.balance as number) || 0,
        });
      }
    }
  }

  return findings;
}

function checkDuplicates(
  invoices: Record<string, unknown>[],
  bills: Record<string, unknown>[]
): AuditResult[] {
  const findings: AuditResult[] = [];

  // Check for duplicate invoice amounts on same date to same customer
  const invoiceKey = (inv: Record<string, unknown>) =>
    `${inv.customer_id}-${inv.date}-${inv.total}`;
  const invoiceMap = new Map<string, Record<string, unknown>[]>();

  for (const inv of invoices) {
    const key = invoiceKey(inv);
    if (!invoiceMap.has(key)) invoiceMap.set(key, []);
    invoiceMap.get(key)!.push(inv);
  }

  invoiceMap.forEach((group) => {
    if (group.length > 1) {
      findings.push({
        findingType: "duplicate_invoice",
        severity: "warning",
        title: `Possible duplicate invoices: ${group.map((i) => i.invoice_number).join(", ")}`,
        description: `${group.length} invoices with same customer, date, and amount ($${group[0].total}) found. This may indicate duplicate entries.`,
        entityType: "invoice",
        entityId: group[0].invoice_id as string,
        amount: (group[0].total as number) || 0,
      });
    }
  });

  // Check for duplicate bills
  const billKey = (b: Record<string, unknown>) =>
    `${b.vendor_id}-${b.date}-${b.total}`;
  const billMap = new Map<string, Record<string, unknown>[]>();

  for (const bill of bills) {
    const key = billKey(bill);
    if (!billMap.has(key)) billMap.set(key, []);
    billMap.get(key)!.push(bill);
  }

  billMap.forEach((group) => {
    if (group.length > 1) {
      findings.push({
        findingType: "duplicate_bill",
        severity: "warning",
        title: `Possible duplicate bills: ${group.map((b) => b.bill_number).join(", ")}`,
        description: `${group.length} bills with same vendor, date, and amount ($${group[0].total}) found.`,
        entityType: "bill",
        entityId: group[0].bill_id as string,
        amount: (group[0].total as number) || 0,
      });
    }
  });

  return findings;
}

function checkPaymentMismatches(
  invoices: Record<string, unknown>[],
  payments: Record<string, unknown>[]
): AuditResult[] {
  const findings: AuditResult[] = [];

  // Find invoices marked as paid but with remaining balance
  for (const inv of invoices) {
    if (inv.status === "paid" && (inv.balance as number) > 0) {
      findings.push({
        findingType: "payment_mismatch",
        severity: "critical",
        title: `Invoice ${inv.invoice_number} marked paid but has balance`,
        description: `Invoice #${inv.invoice_number} status is "paid" but still has a balance of $${inv.balance}.`,
        entityType: "invoice",
        entityId: inv.invoice_id as string,
        amount: (inv.balance as number) || 0,
      });
    }
  }

  // Check for overpayments
  for (const pay of payments) {
    const unused = (pay.unused_amount as number) || 0;
    if (unused > 0) {
      findings.push({
        findingType: "excess_payment",
        severity: "info",
        title: `Excess payment of $${unused} from ${pay.customer_name}`,
        description: `Payment #${pay.payment_number} has $${unused} in unused/excess amount that should be applied or refunded.`,
        entityType: "payment",
        entityId: pay.payment_id as string,
        amount: unused,
      });
    }
  }

  return findings;
}

function checkUnusualAmounts(expenses: Record<string, unknown>[]): AuditResult[] {
  const findings: AuditResult[] = [];

  // Group expenses by account and find outliers
  const byAccount = new Map<string, number[]>();
  const byAccountExpenses = new Map<string, Record<string, unknown>[]>();

  for (const exp of expenses) {
    const acct = (exp.account_name as string) || "Unknown";
    if (!byAccount.has(acct)) {
      byAccount.set(acct, []);
      byAccountExpenses.set(acct, []);
    }
    byAccount.get(acct)!.push((exp.total as number) || 0);
    byAccountExpenses.get(acct)!.push(exp);
  }

  byAccount.forEach((amounts, account) => {
    if (amounts.length < 3) return;

    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, x) => sum + (x - mean) ** 2, 0) / amounts.length
    );

    if (stdDev === 0) return;

    const accountExpenses = byAccountExpenses.get(account)!;
    for (let i = 0; i < amounts.length; i++) {
      const zScore = Math.abs((amounts[i] - mean) / stdDev);
      if (zScore > 3 && amounts[i] > 100) {
        const exp = accountExpenses[i];
        findings.push({
          findingType: "unusual_amount",
          severity: "warning",
          title: `Unusual expense of $${amounts[i].toFixed(2)} in ${account}`,
          description: `Expense on ${exp.date} for $${amounts[i].toFixed(2)} is ${zScore.toFixed(1)} standard deviations from the mean ($${mean.toFixed(2)}) for ${account}. This could be an error or unusual charge.`,
          entityType: "expense",
          entityId: exp.expense_id as string,
          amount: amounts[i],
        });
      }
    }
  });

  return findings;
}

function checkUncategorized(expenses: Record<string, unknown>[]): AuditResult[] {
  const findings: AuditResult[] = [];
  let uncatCount = 0;
  let uncatTotal = 0;

  for (const exp of expenses) {
    const accountName = (exp.account_name as string) || "";
    if (
      !accountName ||
      accountName.toLowerCase().includes("uncategorized") ||
      accountName.toLowerCase().includes("suspense") ||
      accountName.toLowerCase().includes("ask my accountant")
    ) {
      uncatCount++;
      uncatTotal += (exp.total as number) || 0;
    }
  }

  if (uncatCount > 0) {
    findings.push({
      findingType: "uncategorized_expenses",
      severity: uncatCount > 10 ? "critical" : "warning",
      title: `${uncatCount} uncategorized expenses totaling $${uncatTotal.toFixed(2)}`,
      description: `Found ${uncatCount} expenses that are uncategorized or in suspense accounts. Total amount: $${uncatTotal.toFixed(2)}. These should be properly categorized for accurate reporting.`,
      entityType: "expense",
      entityId: "",
      amount: uncatTotal,
    });
  }

  return findings;
}

// ============ AI Deep Analysis ============

async function runAIAnalysis(
  apiKey: string,
  model: string,
  data: Record<string, unknown>
): Promise<AuditResult[]> {
  const prompt = `You are an expert forensic bookkeeper auditing the financial records of Transway Group, a Canadian trucking company.

I'm going to give you a summary of their Zoho Books data. Analyze it for:
1. **Discrepancies** - amounts that don't add up, status mismatches
2. **Missing records** - gaps in invoice numbering, missing payments for completed services
3. **Tax issues** - HST/GST compliance, incorrect tax calculations
4. **Cash flow concerns** - late payments, aging receivables patterns
5. **Unusual patterns** - sudden changes in spending, vendor concentration risks
6. **Categorization issues** - expenses in wrong accounts for a trucking business

The structural checks already found these issues:
${JSON.stringify(data.structuralFindings, null, 2)}

Here is the financial data summary:
- Total Invoices: ${data.invoiceCount}
- Total Bills: ${data.billCount}
- Total Expenses: ${data.expenseCount}
- Total Contacts: ${data.contactCount}

Recent Invoices (up to 100):
${JSON.stringify(data.invoices, null, 2).substring(0, 15000)}

Recent Bills (up to 100):
${JSON.stringify(data.bills, null, 2).substring(0, 15000)}

Recent Expenses (up to 100):
${JSON.stringify(data.expenses, null, 2).substring(0, 10000)}

Chart of Accounts:
${JSON.stringify(data.chartOfAccounts, null, 2).substring(0, 5000)}

Bank Accounts:
${JSON.stringify(data.bankAccounts, null, 2).substring(0, 3000)}

Customer Payments (up to 50):
${JSON.stringify(data.customerPayments, null, 2).substring(0, 8000)}

Vendor Payments (up to 50):
${JSON.stringify(data.vendorPayments, null, 2).substring(0, 8000)}

Based on this data, provide ADDITIONAL findings beyond what the structural checks already found.
Return your findings as a JSON array of objects with this exact structure:
[
  {
    "findingType": "string (e.g. tax_issue, categorization_error, missing_record, cash_flow_concern, vendor_risk, compliance_issue)",
    "severity": "critical" | "warning" | "info",
    "title": "Short descriptive title",
    "description": "Detailed explanation with specific numbers and entity references",
    "entityType": "invoice" | "bill" | "expense" | "payment" | "account" | "contact" | "general",
    "entityId": "Zoho entity ID if applicable, empty string otherwise",
    "amount": 0
  }
]

Return ONLY the JSON array, no other text. Be specific with dollar amounts and dates.`;

  try {
    const response = await chatWithClaude({
      apiKey,
      model,
      temperature: 0.2,
      systemPrompt: "You are a forensic bookkeeper. Return only valid JSON arrays.",
      messages: [{ role: "user", content: prompt }],
      maxTokens: 4096,
    });

    const textContent = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Parse JSON from response
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as AuditResult[];
      return parsed.map((f) => ({
        findingType: f.findingType || "ai_finding",
        severity: f.severity || "info",
        title: f.title || "AI Finding",
        description: f.description || "",
        entityType: f.entityType || "general",
        entityId: f.entityId || "",
        amount: f.amount || 0,
      }));
    }
  } catch (error) {
    console.error("AI audit analysis failed:", error);
    return [{
      findingType: "ai_error",
      severity: "info",
      title: "AI analysis could not complete",
      description: `The AI deep analysis encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Structural checks were still performed successfully.`,
      entityType: "general",
      entityId: "",
      amount: 0,
    }];
  }

  return [];
}

export async function getAuditFindings(filters?: {
  severity?: string;
  status?: string;
  findingType?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.severity) where.severity = filters.severity;
  if (filters?.status) where.status = filters.status;
  if (filters?.findingType) where.findingType = filters.findingType;

  return prisma.auditFinding.findMany({
    where,
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });
}

export async function resolveAuditFinding(id: string, resolution: string) {
  return prisma.auditFinding.update({
    where: { id },
    data: {
      status: "resolved",
      resolution,
      resolvedAt: new Date(),
    },
  });
}
