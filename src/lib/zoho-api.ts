import prisma from "@/lib/prisma";
import { getValidAccessToken } from "@/lib/zoho-auth";

const ZOHO_BOOKS_API = "https://www.zohoapis.ca/books/v3";

interface ZohoApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}

interface ZohoListResponse<T> {
  code: number;
  message: string;
  data: T[];
  page_context?: {
    page: number;
    per_page: number;
    has_more_page: boolean;
    total: number;
    total_pages: number;
  };
}

function logAction(
  action: string,
  endpoint: string,
  method: string,
  requestBody: string,
  responseBody: string,
  status: string,
  error: string,
  aiInitiated: boolean
) {
  // Fire-and-forget: don't await to avoid SQLite write lock contention
  prisma.auditLog.create({
    data: { action, endpoint, method, requestBody, responseBody, status, error, aiInitiated },
  }).catch(() => {
    // Silently ignore audit log failures
  });
}

async function getOrgId(): Promise<string> {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  if (!settings?.zohoOrgId) throw new Error("Zoho Organization ID not configured");
  return settings.zohoOrgId;
}

export async function zohoApiCall<T = unknown>(
  endpoint: string,
  options: ZohoApiOptions = {},
  aiInitiated = false
): Promise<T> {
  const { method = "GET", body, params = {} } = options;
  const accessToken = await getValidAccessToken();
  const orgId = await getOrgId();

  const url = new URL(`${ZOHO_BOOKS_API}/${endpoint}`);
  url.searchParams.set("organization_id", orgId);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
  };

  if (body && (method === "POST" || method === "PUT")) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), fetchOptions);
  const data = await response.json();

  // Fire-and-forget audit log (no await to prevent SQLite locking)
  logAction(
    `${method} ${endpoint}`,
    endpoint,
    method,
    body ? JSON.stringify(body).substring(0, 2000) : "{}",
    JSON.stringify(data).substring(0, 2000),
    data.code === 0 ? "success" : "error",
    data.code !== 0 ? data.message || "" : "",
    aiInitiated
  );

  if (data.code !== 0) {
    throw new Error(`Zoho API error: ${data.message || "Unknown error"} (code: ${data.code})`);
  }

  return data;
}

// Fetch all pages of a list endpoint
async function fetchAllPages<T>(
  endpoint: string,
  dataKey: string,
  params: Record<string, string> = {},
  aiInitiated = false
): Promise<T[]> {
  const allRecords: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await zohoApiCall<ZohoListResponse<T> & Record<string, unknown>>(
      endpoint,
      { params: { ...params, page: String(page), per_page: "200" } },
      aiInitiated
    );

    const records = (response[dataKey] || response.data || []) as T[];
    allRecords.push(...records);

    hasMore = response.page_context?.has_more_page || false;
    page++;

    // Rate limit protection: max 100 requests per minute
    if (hasMore) await new Promise((r) => setTimeout(r, 650));
  }

  return allRecords;
}

// ===================== LIST ENDPOINTS =====================

export async function listInvoices(params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("invoices", "invoices", params, aiInitiated);
}

export async function listBills(params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("bills", "bills", params, aiInitiated);
}

export async function listExpenses(params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("expenses", "expenses", params, aiInitiated);
}

export async function listContacts(params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("contacts", "contacts", params, aiInitiated);
}

export async function listBankAccounts(params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("bankaccounts", "bankaccounts", params, aiInitiated);
}

export async function listBankTransactions(accountId: string, params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("banktransactions", "banktransactions", { ...params, account_id: accountId }, aiInitiated);
}

export async function listChartOfAccounts(params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("chartofaccounts", "chartofaccounts", params, aiInitiated);
}

export async function listJournals(params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("journals", "journals", params, aiInitiated);
}

export async function listCustomerPayments(params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("customerpayments", "customerpayments", params, aiInitiated);
}

export async function listVendorPayments(params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("vendorpayments", "vendorpayments", params, aiInitiated);
}

export async function listCreditNotes(params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("creditnotes", "creditnotes", params, aiInitiated);
}

export async function listItems(params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("items", "items", params, aiInitiated);
}

export async function listRecurringInvoices(params: Record<string, string> = {}, aiInitiated = false) {
  return fetchAllPages("recurringinvoices", "recurringinvoices", params, aiInitiated);
}

export async function listTaxes(aiInitiated = false) {
  return fetchAllPages("settings/taxes", "taxes", {}, aiInitiated);
}

// ===================== GET SINGLE RECORD =====================

export async function getInvoice(invoiceId: string, aiInitiated = false) {
  const data = await zohoApiCall<{ invoice: unknown }>(`invoices/${invoiceId}`, {}, aiInitiated);
  return data.invoice;
}

export async function getBill(billId: string, aiInitiated = false) {
  const data = await zohoApiCall<{ bill: unknown }>(`bills/${billId}`, {}, aiInitiated);
  return data.bill;
}

export async function getExpense(expenseId: string, aiInitiated = false) {
  const data = await zohoApiCall<{ expense: unknown }>(`expenses/${expenseId}`, {}, aiInitiated);
  return data.expense;
}

export async function getContact(contactId: string, aiInitiated = false) {
  const data = await zohoApiCall<{ contact: unknown }>(`contacts/${contactId}`, {}, aiInitiated);
  return data.contact;
}

export async function getBankAccount(accountId: string, aiInitiated = false) {
  const data = await zohoApiCall<{ bankaccount: unknown }>(`bankaccounts/${accountId}`, {}, aiInitiated);
  return data.bankaccount;
}

export async function getOrganization(aiInitiated = false) {
  const data = await zohoApiCall<{ organization: unknown }>("organization", {}, aiInitiated);
  return data.organization;
}

// ===================== CREATE ENDPOINTS =====================

export async function createInvoice(invoiceData: Record<string, unknown>, aiInitiated = false) {
  const data = await zohoApiCall<{ invoice: unknown }>("invoices", { method: "POST", body: invoiceData }, aiInitiated);
  return data.invoice;
}

export async function createBill(billData: Record<string, unknown>, aiInitiated = false) {
  const data = await zohoApiCall<{ bill: unknown }>("bills", { method: "POST", body: billData }, aiInitiated);
  return data.bill;
}

export async function createExpense(expenseData: Record<string, unknown>, aiInitiated = false) {
  const data = await zohoApiCall<{ expense: unknown }>("expenses", { method: "POST", body: expenseData }, aiInitiated);
  return data.expense;
}

export async function createContact(contactData: Record<string, unknown>, aiInitiated = false) {
  const data = await zohoApiCall<{ contact: unknown }>("contacts", { method: "POST", body: contactData }, aiInitiated);
  return data.contact;
}

export async function createCustomerPayment(paymentData: Record<string, unknown>, aiInitiated = false) {
  const data = await zohoApiCall<{ payment: unknown }>("customerpayments", { method: "POST", body: paymentData }, aiInitiated);
  return data.payment;
}

export async function createVendorPayment(paymentData: Record<string, unknown>, aiInitiated = false) {
  const data = await zohoApiCall<{ vendorpayment: unknown }>("vendorpayments", { method: "POST", body: paymentData }, aiInitiated);
  return data.vendorpayment;
}

export async function createJournalEntry(journalData: Record<string, unknown>, aiInitiated = false) {
  const data = await zohoApiCall<{ journal: unknown }>("journals", { method: "POST", body: journalData }, aiInitiated);
  return data.journal;
}

export async function createBankTransaction(txnData: Record<string, unknown>, aiInitiated = false) {
  const data = await zohoApiCall<{ banktransaction: unknown }>("banktransactions", { method: "POST", body: txnData }, aiInitiated);
  return data.banktransaction;
}

// ===================== UPDATE ENDPOINTS =====================

export async function updateInvoice(invoiceId: string, invoiceData: Record<string, unknown>, aiInitiated = false) {
  const data = await zohoApiCall<{ invoice: unknown }>(`invoices/${invoiceId}`, { method: "PUT", body: invoiceData }, aiInitiated);
  return data.invoice;
}

export async function updateBill(billId: string, billData: Record<string, unknown>, aiInitiated = false) {
  const data = await zohoApiCall<{ bill: unknown }>(`bills/${billId}`, { method: "PUT", body: billData }, aiInitiated);
  return data.bill;
}

export async function updateExpense(expenseId: string, expenseData: Record<string, unknown>, aiInitiated = false) {
  const data = await zohoApiCall<{ expense: unknown }>(`expenses/${expenseId}`, { method: "PUT", body: expenseData }, aiInitiated);
  return data.expense;
}

export async function updateContact(contactId: string, contactData: Record<string, unknown>, aiInitiated = false) {
  const data = await zohoApiCall<{ contact: unknown }>(`contacts/${contactId}`, { method: "PUT", body: contactData }, aiInitiated);
  return data.contact;
}

// ===================== ACTION ENDPOINTS =====================

export async function sendInvoice(invoiceId: string, emailData: Record<string, unknown>, aiInitiated = false) {
  return zohoApiCall(`invoices/${invoiceId}/email`, { method: "POST", body: emailData }, aiInitiated);
}

export async function markInvoiceAsSent(invoiceId: string, aiInitiated = false) {
  return zohoApiCall(`invoices/${invoiceId}/status/sent`, { method: "POST" }, aiInitiated);
}

export async function voidInvoice(invoiceId: string, aiInitiated = false) {
  return zohoApiCall(`invoices/${invoiceId}/status/void`, { method: "POST" }, aiInitiated);
}

export async function approveBill(billId: string, aiInitiated = false) {
  return zohoApiCall(`bills/${billId}/status/open`, { method: "POST" }, aiInitiated);
}

// ===================== CATEGORIZE BANK TRANSACTION =====================

export async function categorizeTransaction(
  transactionId: string,
  accountId: string,
  txnData: Record<string, unknown>,
  aiInitiated = false
) {
  return zohoApiCall(
    `banktransactions/uncategorized/${transactionId}/categorize`,
    { method: "POST", body: { ...txnData, account_id: accountId } },
    aiInitiated
  );
}

export async function matchBankTransaction(
  transactionId: string,
  matchData: Record<string, unknown>,
  aiInitiated = false
) {
  return zohoApiCall(
    `banktransactions/uncategorized/${transactionId}/match`,
    { method: "POST", body: matchData },
    aiInitiated
  );
}

// ===================== RECONCILIATION =====================

export async function getUncategorizedTransactions(accountId: string, aiInitiated = false) {
  return fetchAllPages(
    "banktransactions",
    "banktransactions",
    { account_id: accountId, status: "uncategorized" },
    aiInitiated
  );
}

export async function getMatchingTransactions(transactionId: string, aiInitiated = false) {
  const data = await zohoApiCall<{ matching_transactions: unknown[] }>(
    `banktransactions/uncategorized/${transactionId}/match`,
    {},
    aiInitiated
  );
  return data.matching_transactions;
}
