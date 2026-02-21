import type { ToolDefinition } from "./claude";

export const BOOKKEEPER_SYSTEM_PROMPT = `You are an autonomous AI Bookkeeper for Transway Group, a Canadian trucking/transport company using Zoho Books.
You have FULL READ AND WRITE access to their Zoho Books account.

YOUR ROLE:
- You are the company's bookkeeper. You manage invoices, bills, expenses, payments, and bank reconciliation.
- You can CREATE, READ, UPDATE, and categorize any financial record in Zoho Books.
- You make decisions autonomously like a professional bookkeeper would.
- You work in CAD (Canadian Dollars) unless specified otherwise.

TRUCKING BUSINESS CONTEXT:
- Revenue comes from freight/shipping services, dispatch fees, and logistics
- Common expenses: fuel, vehicle maintenance/repairs, insurance, driver pay, permits/licenses, tolls, truck payments/leases, office/admin
- Chart of accounts should reflect trucking industry standards
- HST/GST applies (Ontario, Canada)

CAPABILITIES:
- LIST all invoices, bills, expenses, bank transactions, contacts, payments, chart of accounts
- GET details of any specific record by ID
- CREATE new invoices, bills, expenses, payments, journal entries, bank transactions, contacts
- UPDATE existing invoices, bills, expenses, contacts
- CATEGORIZE uncategorized bank transactions
- MATCH bank transactions to invoices/bills for reconciliation
- SEND invoices via email to customers
- AUDIT historical transactions and find discrepancies

WORKFLOW:
1. When asked about financials, ALWAYS use list tools first to get real data
2. Analyze the data thoroughly before responding
3. When creating records, use proper accounts and tax settings
4. When categorizing transactions, match vendor names to appropriate expense categories
5. Log every action for audit trail

GUIDELINES:
- Always be specific with numbers and cite the source data
- Format currency as CAD with $ symbol and thousands separators
- Use markdown tables for lists
- Flag concerning patterns (late payments, unusual amounts, duplicate entries)
- When you find errors, explain what's wrong and fix them
- For ambiguous cases, explain your reasoning
- Be concise but thorough

IMPORTANT:
- Every write action (create, update, categorize) is logged in the audit trail
- Double-check amounts before creating financial records
- For large or unusual transactions, explain what you're doing and why`;

export const BOOKKEEPER_TOOLS: ToolDefinition[] = [
  // =============== LIST TOOLS (Read All) ===============
  {
    name: "list_invoices",
    description: "List ALL invoices from Zoho Books. Use to see revenue, outstanding amounts, overdue invoices. Can filter by status, date, customer.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter: draft, sent, overdue, paid, void, unpaid, partially_paid" },
        date_start: { type: "string", description: "Start date YYYY-MM-DD" },
        date_end: { type: "string", description: "End date YYYY-MM-DD" },
        customer_id: { type: "string", description: "Filter by customer ID" },
        sort_column: { type: "string", description: "Sort by: date, invoice_number, customer_name, total, balance, status" },
      },
    },
  },
  {
    name: "list_bills",
    description: "List ALL bills from Zoho Books. Use to see payables, vendor bills, overdue bills.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter: open, overdue, paid, void, partially_paid" },
        date_start: { type: "string", description: "Start date YYYY-MM-DD" },
        date_end: { type: "string", description: "End date YYYY-MM-DD" },
        vendor_id: { type: "string", description: "Filter by vendor ID" },
      },
    },
  },
  {
    name: "list_expenses",
    description: "List ALL expenses. Use to analyze spending, find categories, review costs.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "Filter: unbilled, invoiced, reimbursed, non-billable" },
        date_start: { type: "string", description: "Start date YYYY-MM-DD" },
        date_end: { type: "string", description: "End date YYYY-MM-DD" },
        account_name: { type: "string", description: "Filter by expense account name" },
      },
    },
  },
  {
    name: "list_contacts",
    description: "List ALL customers and vendors. Use to find contact IDs, check outstanding balances.",
    input_schema: {
      type: "object",
      properties: {
        contact_type: { type: "string", description: "Filter: customer, vendor" },
        status: { type: "string", description: "Filter: active, inactive" },
      },
    },
  },
  {
    name: "list_bank_accounts",
    description: "List ALL bank accounts with balances.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_bank_transactions",
    description: "List bank transactions for a specific account. Use for reconciliation and cash flow analysis.",
    input_schema: {
      type: "object",
      properties: {
        account_id: { type: "string", description: "Bank account ID (required)" },
        date_start: { type: "string", description: "Start date YYYY-MM-DD" },
        date_end: { type: "string", description: "End date YYYY-MM-DD" },
        status: { type: "string", description: "Filter: manually_added, imported, categorized, uncategorized" },
      },
      required: ["account_id"],
    },
  },
  {
    name: "list_chart_of_accounts",
    description: "List the full chart of accounts. Use to find account IDs for categorization.",
    input_schema: {
      type: "object",
      properties: {
        account_type: { type: "string", description: "Filter: expense, income, asset, liability, equity" },
      },
    },
  },
  {
    name: "list_journals",
    description: "List all journal entries.",
    input_schema: {
      type: "object",
      properties: {
        date_start: { type: "string", description: "Start date YYYY-MM-DD" },
        date_end: { type: "string", description: "End date YYYY-MM-DD" },
      },
    },
  },
  {
    name: "list_customer_payments",
    description: "List all customer payments received.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_vendor_payments",
    description: "List all vendor payments made.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_credit_notes",
    description: "List all credit notes.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_items",
    description: "List all products/services/items.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_taxes",
    description: "List all tax rates configured.",
    input_schema: { type: "object", properties: {} },
  },

  // =============== GET SINGLE RECORD ===============
  {
    name: "get_invoice",
    description: "Get full details of a specific invoice by ID.",
    input_schema: {
      type: "object",
      properties: { invoice_id: { type: "string", description: "Invoice ID" } },
      required: ["invoice_id"],
    },
  },
  {
    name: "get_bill",
    description: "Get full details of a specific bill by ID.",
    input_schema: {
      type: "object",
      properties: { bill_id: { type: "string", description: "Bill ID" } },
      required: ["bill_id"],
    },
  },
  {
    name: "get_expense",
    description: "Get full details of a specific expense by ID.",
    input_schema: {
      type: "object",
      properties: { expense_id: { type: "string", description: "Expense ID" } },
      required: ["expense_id"],
    },
  },
  {
    name: "get_contact",
    description: "Get full details of a customer or vendor by ID.",
    input_schema: {
      type: "object",
      properties: { contact_id: { type: "string", description: "Contact ID" } },
      required: ["contact_id"],
    },
  },
  {
    name: "get_bank_account",
    description: "Get details of a specific bank account.",
    input_schema: {
      type: "object",
      properties: { account_id: { type: "string", description: "Bank account ID" } },
      required: ["account_id"],
    },
  },
  {
    name: "get_organization",
    description: "Get organization/company details.",
    input_schema: { type: "object", properties: {} },
  },

  // =============== CREATE ===============
  {
    name: "create_invoice",
    description: "Create a new invoice in Zoho Books. Requires customer_id, line_items with item details.",
    input_schema: {
      type: "object",
      properties: {
        invoice_data: {
          type: "object",
          description: "Invoice data: { customer_id, date, due_date, line_items: [{ name, description, rate, quantity }], notes, terms }",
        },
      },
      required: ["invoice_data"],
    },
  },
  {
    name: "create_bill",
    description: "Create a new bill (vendor invoice) in Zoho Books.",
    input_schema: {
      type: "object",
      properties: {
        bill_data: {
          type: "object",
          description: "Bill data: { vendor_id, bill_number, date, due_date, line_items: [{ account_id, description, amount }] }",
        },
      },
      required: ["bill_data"],
    },
  },
  {
    name: "create_expense",
    description: "Create a new expense record.",
    input_schema: {
      type: "object",
      properties: {
        expense_data: {
          type: "object",
          description: "Expense data: { account_id, date, amount, vendor_id, description, is_billable, customer_id }",
        },
      },
      required: ["expense_data"],
    },
  },
  {
    name: "create_customer_payment",
    description: "Record a customer payment received.",
    input_schema: {
      type: "object",
      properties: {
        payment_data: {
          type: "object",
          description: "Payment data: { customer_id, payment_mode, amount, date, invoices: [{ invoice_id, amount_applied }] }",
        },
      },
      required: ["payment_data"],
    },
  },
  {
    name: "create_vendor_payment",
    description: "Record a vendor payment made.",
    input_schema: {
      type: "object",
      properties: {
        payment_data: {
          type: "object",
          description: "Payment data: { vendor_id, payment_mode, amount, date, bills: [{ bill_id, amount_applied }] }",
        },
      },
      required: ["payment_data"],
    },
  },
  {
    name: "create_journal_entry",
    description: "Create a manual journal entry for adjustments.",
    input_schema: {
      type: "object",
      properties: {
        journal_data: {
          type: "object",
          description: "Journal data: { journal_date, reference_number, notes, line_items: [{ account_id, debit_or_credit, amount, description }] }",
        },
      },
      required: ["journal_data"],
    },
  },
  {
    name: "create_contact",
    description: "Create a new customer or vendor contact.",
    input_schema: {
      type: "object",
      properties: {
        contact_data: {
          type: "object",
          description: "Contact data: { contact_name, contact_type (customer/vendor), email, phone, billing_address }",
        },
      },
      required: ["contact_data"],
    },
  },

  // =============== UPDATE ===============
  {
    name: "update_invoice",
    description: "Update an existing invoice.",
    input_schema: {
      type: "object",
      properties: {
        invoice_id: { type: "string", description: "Invoice ID to update" },
        invoice_data: { type: "object", description: "Fields to update" },
      },
      required: ["invoice_id", "invoice_data"],
    },
  },
  {
    name: "update_bill",
    description: "Update an existing bill.",
    input_schema: {
      type: "object",
      properties: {
        bill_id: { type: "string", description: "Bill ID to update" },
        bill_data: { type: "object", description: "Fields to update" },
      },
      required: ["bill_id", "bill_data"],
    },
  },
  {
    name: "update_expense",
    description: "Update an existing expense.",
    input_schema: {
      type: "object",
      properties: {
        expense_id: { type: "string", description: "Expense ID to update" },
        expense_data: { type: "object", description: "Fields to update" },
      },
      required: ["expense_id", "expense_data"],
    },
  },

  // =============== ACTIONS ===============
  {
    name: "send_invoice",
    description: "Email an invoice to the customer.",
    input_schema: {
      type: "object",
      properties: {
        invoice_id: { type: "string", description: "Invoice ID to send" },
        email_data: { type: "object", description: "Optional: { to_mail_ids, subject, body }" },
      },
      required: ["invoice_id"],
    },
  },
  {
    name: "categorize_transaction",
    description: "Categorize an uncategorized bank transaction to a specific account.",
    input_schema: {
      type: "object",
      properties: {
        transaction_id: { type: "string", description: "Bank transaction ID" },
        account_id: { type: "string", description: "Chart of account ID to categorize into" },
        transaction_data: { type: "object", description: "Additional data like vendor_id, description" },
      },
      required: ["transaction_id", "account_id"],
    },
  },
  {
    name: "match_bank_transaction",
    description: "Match a bank transaction to an existing invoice or bill for reconciliation.",
    input_schema: {
      type: "object",
      properties: {
        transaction_id: { type: "string", description: "Bank transaction ID" },
        match_data: { type: "object", description: "Match data: { transactions_to_be_matched: [{ transaction_id, transaction_type }] }" },
      },
      required: ["transaction_id", "match_data"],
    },
  },
  {
    name: "get_uncategorized_transactions",
    description: "Get all uncategorized bank transactions that need to be categorized.",
    input_schema: {
      type: "object",
      properties: {
        account_id: { type: "string", description: "Bank account ID" },
      },
      required: ["account_id"],
    },
  },
  {
    name: "get_matching_transactions",
    description: "Find potential matches for a bank transaction (for reconciliation).",
    input_schema: {
      type: "object",
      properties: {
        transaction_id: { type: "string", description: "Bank transaction ID to find matches for" },
      },
      required: ["transaction_id"],
    },
  },
];

export const REPORT_PROMPTS: Record<string, string> = {
  pnl: `Generate a Profit & Loss report analysis. Structure it with:
## Executive Summary (2-3 sentences)
## Revenue Analysis (breakdown, trends)
## Cost Analysis (major expenses, categories)
## Net Profit/Loss
## Key Insights & Recommendations
Use markdown tables where appropriate. Be specific with numbers.`,

  expense: `Generate an Expense Breakdown report. Structure it with:
## Executive Summary
## Top Expense Categories (table with amounts and percentages)
## Notable Trends
## Unusual or Flagged Items
## Cost Optimization Suggestions
Format amounts as currency. Highlight any anomalies.`,

  aging: `Generate an Invoice Aging report. Structure it with:
## Summary (total outstanding, count)
## Aging Buckets (table: Current, 1-30, 31-60, 61-90, 90+ days)
## At-Risk Accounts (highest outstanding balances)
## Collection Recommendations
## Cash Flow Impact Assessment
Highlight overdue amounts in the analysis.`,

  vendor: `Generate a Vendor Payment Analysis. Structure it with:
## Summary
## Top Vendors by Payment Volume (table)
## Payment Timing Analysis (early, on-time, late patterns)
## Vendor Credit Utilization
## Recommendations
Identify patterns that could improve cash management.`,

  cashflow: `Generate a Cash Flow Analysis. Structure it with:
## Cash Position Summary
## Inflows (by category)
## Outflows (by category)
## Net Cash Flow
## Projected Trend
## Liquidity Recommendations
Compare inflows vs outflows and highlight any concerns.`,
};
