async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

export const settingsApi = {
  get: () => apiFetch<Record<string, unknown>>("/api/settings"),
  update: (data: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export const dashboardApi = {
  get: () => apiFetch<Record<string, unknown>>("/api/dashboard"),
};

export const chatApi = {
  send: (data: { conversationId?: string; message: string }) =>
    apiFetch<{ conversationId: string; message: string; metadata: Record<string, unknown> }>(
      "/api/chat",
      { method: "POST", body: JSON.stringify(data) }
    ),
  history: (page = 1, limit = 20) =>
    apiFetch<Record<string, unknown>[]>(`/api/chat/history?page=${page}&limit=${limit}`),
};

export const zohoApi = {
  organization: () => apiFetch<Record<string, unknown>>("/api/zoho/organization"),
  invoices: (id?: string) =>
    apiFetch<Record<string, unknown>>(`/api/zoho/invoices${id ? `?invoiceId=${id}` : ""}`),
  bills: (id?: string) =>
    apiFetch<Record<string, unknown>>(`/api/zoho/bills${id ? `?billId=${id}` : ""}`),
  expenses: (id?: string) =>
    apiFetch<Record<string, unknown>>(`/api/zoho/expenses${id ? `?expenseId=${id}` : ""}`),
  contacts: (id?: string) =>
    apiFetch<Record<string, unknown>>(`/api/zoho/contacts${id ? `?contactId=${id}` : ""}`),
  bankAccounts: (id?: string) =>
    apiFetch<Record<string, unknown>>(`/api/zoho/bank-accounts${id ? `?accountId=${id}` : ""}`),
  bankTransactions: (id?: string) =>
    apiFetch<Record<string, unknown>>(`/api/zoho/bank-transactions${id ? `?transactionId=${id}` : ""}`),
  payments: (type: "customer" | "vendor", id?: string) =>
    apiFetch<Record<string, unknown>>(`/api/zoho/payments?type=${type}${id ? `&paymentId=${id}` : ""}`),
};

export const analysisApi = {
  analyze: (data: { analysisType: string; parameters: Record<string, unknown> }) =>
    apiFetch<Record<string, unknown>>("/api/analysis", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const reportsApi = {
  generate: (data: { reportType: string; dateRange: { start: string; end: string }; options?: Record<string, unknown> }) =>
    apiFetch<Record<string, unknown>>("/api/reports/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  saved: () => apiFetch<Record<string, unknown>[]>("/api/reports/saved"),
  save: (data: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>("/api/reports/saved", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const reconciliationApi = {
  suggestions: (bankAccountId: string) =>
    apiFetch<Record<string, unknown>>("/api/reconciliation/suggestions", {
      method: "POST",
      body: JSON.stringify({ bankAccountId }),
    }),
};
