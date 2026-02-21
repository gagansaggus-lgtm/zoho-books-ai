export type FinancialStatus = "paid" | "overdue" | "partial" | "draft" | "sent" | "void";

export interface DashboardData {
  revenue: {
    total: number;
    invoiceCount: number;
    paidCount: number;
    trend: number;
  };
  expenses: {
    total: number;
    billCount: number;
    expenseCount: number;
    trend: number;
  };
  profit: {
    net: number;
    margin: number;
    trend: number;
  };
  outstanding: {
    receivable: number;
    payable: number;
    invoiceCount: number;
    billCount: number;
  };
  recentTransactions: RecentTransaction[];
  cashFlow: {
    inflow: number;
    outflow: number;
    net: number;
  };
}

export interface RecentTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
}

export interface AppSettings {
  id: string;
  zohoOrgId: string;
  anthropicApiKey: string;
  aiModel: string;
  aiTemperature: number;
  cacheMinutes: number;
  currency: string;
  fiscalYearStart: string;
}
