import prisma from "@/lib/prisma";

// Cache helper
async function getCached(cacheKey: string): Promise<unknown | null> {
  const cached = await prisma.zohoCache.findUnique({ where: { cacheKey } });
  if (cached && new Date(cached.expiresAt) > new Date()) {
    return JSON.parse(cached.data);
  }
  if (cached) {
    await prisma.zohoCache.delete({ where: { cacheKey } });
  }
  return null;
}

async function setCache(cacheKey: string, endpoint: string, data: unknown, cacheMinutes: number) {
  const expiresAt = new Date(Date.now() + cacheMinutes * 60 * 1000);
  await prisma.zohoCache.upsert({
    where: { cacheKey },
    update: { data: JSON.stringify(data), expiresAt },
    create: { cacheKey, endpoint, data: JSON.stringify(data), expiresAt },
  });
}

export async function getSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings || !settings.zohoOrgId) {
    throw new Error("Zoho Organization ID not configured. Please set it in Settings.");
  }
  return settings;
}

// This module provides helper functions that API routes use
// to interact with Zoho Books data. Since MCP tools are called
// externally (not from within Next.js server), these functions
// provide caching and data transformation.

export async function cacheZohoData(endpoint: string, params: Record<string, string>, data: unknown) {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
  await setCache(cacheKey, endpoint, data, settings?.cacheMinutes || 15);
}

export async function getCachedZohoData(endpoint: string, params: Record<string, string>): Promise<unknown | null> {
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
  return getCached(cacheKey);
}

export async function clearCache(endpoint?: string) {
  if (endpoint) {
    await prisma.zohoCache.deleteMany({
      where: { endpoint },
    });
  } else {
    await prisma.zohoCache.deleteMany();
  }
}

// Tool name to MCP function mapping for the chat AI
export const TOOL_TO_MCP_MAP: Record<string, { mcpTool: string; idParam: string }> = {
  get_invoices: { mcpTool: "ZohoBooks_get_invoice", idParam: "invoice_id" },
  get_bills: { mcpTool: "ZohoBooks_get_bill", idParam: "bill_id" },
  get_expenses: { mcpTool: "ZohoBooks_get_expense", idParam: "expense_id" },
  get_contacts: { mcpTool: "ZohoBooks_get_contact", idParam: "contact_id" },
  get_bank_accounts: { mcpTool: "ZohoBooks_get_bank_account", idParam: "account_id" },
  get_bank_transactions: { mcpTool: "ZohoBooks_get_bank_transaction", idParam: "bank_transaction_id" },
  get_customer_payments: { mcpTool: "ZohoBooks_get_customer_payment", idParam: "payment_id" },
  get_vendor_payments: { mcpTool: "ZohoBooks_get_vendor_payment", idParam: "payment_id" },
  get_chart_of_accounts: { mcpTool: "ZohoBooks_get_chart_of_account", idParam: "account_id" },
  get_journals: { mcpTool: "ZohoBooks_get_journal", idParam: "journal_id" },
  get_credit_notes: { mcpTool: "ZohoBooks_get_credit_note", idParam: "creditnote_id" },
  get_taxes: { mcpTool: "ZohoBooks_get_tax", idParam: "tax_id" },
  get_matching_transactions: { mcpTool: "ZohoBooks_get_matching_bank_transactions", idParam: "transaction_id" },
  get_organization: { mcpTool: "ZohoBooks_get_organization", idParam: "organization_id" },
  get_items: { mcpTool: "ZohoBooks_get_item", idParam: "item_id" },
  get_recurring_invoices: { mcpTool: "ZohoBooks_get_recurring_invoice", idParam: "recurring_invoice_id" },
  get_recurring_bills: { mcpTool: "ZohoBooks_get_recurring_bill", idParam: "recurring_bill_id" },
  get_recurring_expenses: { mcpTool: "ZohoBooks_get_recurring_expense", idParam: "recurring_expense_id" },
};
