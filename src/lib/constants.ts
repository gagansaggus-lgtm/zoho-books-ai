export const APP_NAME = "AI Bookkeeper";
export const APP_DESCRIPTION = "AI-powered bookkeeping for Zoho Books";
export const DEFAULT_PORT = 3001;

export const REPORT_TYPES = {
  pnl: { label: "Profit & Loss", description: "Revenue vs expenses analysis" },
  expense: { label: "Expense Breakdown", description: "Spending by category" },
  aging: { label: "Invoice Aging", description: "Outstanding invoice analysis" },
  vendor: { label: "Vendor Analysis", description: "Vendor payment patterns" },
  cashflow: { label: "Cash Flow", description: "Money in vs money out" },
  custom: { label: "Custom Report", description: "AI-generated custom analysis" },
} as const;

export const SUGGESTED_QUERIES = [
  "What's my total revenue this month?",
  "Show me outstanding invoices",
  "Top 5 expenses by amount",
  "Analyze my cash flow",
  "Which bills are overdue?",
  "Compare income vs expenses",
  "Who are my top customers?",
  "What recurring expenses do I have?",
];

export const SEVERITY_COLORS = {
  info: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  warning: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
} as const;
