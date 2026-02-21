# Plan: Full Autonomous AI Bookkeeper for Zoho Books

## Goal
Upgrade the existing read-only AI Bookkeeper app to a **fully autonomous bookkeeping system** where Claude AI can:
1. **Audit** all historical transactions and find discrepancies
2. **Create** invoices, bills, expenses, payments, journal entries
3. **Categorize** bank transactions automatically
4. **Reconcile** bank statements with books
5. **Manage** invoices & bills (create, send, track, flag overdue)
6. **Ask the user** questions in plain English when unsure

## Why: Current MCP Limitations
- All 92 Zoho Books MCP tools are GET-only (read)
- No list/search endpoints (can only fetch by ID)
- No create/update/delete capabilities
- Staff role user with limited permissions

## Architecture Change

### Current:
```
Chat -> Claude AI -> MCP Bridge (read-only) -> Zoho Books
```

### New:
```
Chat -> Claude AI -> Zoho Books REST API (full CRUD) -> Zoho Books
                  -> Audit Engine (background analysis)
                  -> Action Log (every write recorded)
```

## Phase 1: Zoho Books OAuth2 + REST API Integration
**Files to create/modify:**

1. `src/lib/zoho-auth.ts` — OAuth2 flow (authorization code grant)
   - Generate auth URL for user consent
   - Exchange code for access + refresh tokens
   - Auto-refresh expired tokens
   - Store tokens securely in SQLite

2. `src/lib/zoho-api.ts` — Full Zoho Books REST API client
   - LIST endpoints (invoices, bills, expenses, contacts, bank transactions, chart of accounts)
   - CREATE endpoints (invoices, bills, expenses, payments, journal entries)
   - UPDATE endpoints (categorize transactions, update contacts, mark as paid)
   - DELETE endpoints (with confirmation safeguards)
   - Pagination handling (fetch ALL records)
   - Rate limiting (Zoho: 100 requests/min)

3. `src/app/api/zoho/auth/route.ts` — OAuth callback handler
4. `src/app/api/zoho/auth/connect/route.ts` — Initiate OAuth flow

5. `prisma/schema.prisma` — Add new models:
   - `ZohoTokens` (access_token, refresh_token, expires_at)
   - `AuditLog` (every AI action recorded)
   - `BookkeepingRule` (learned categorization rules)
   - `AuditFinding` (discrepancies found)

## Phase 2: Full Data Pull + Audit Engine
**Files to create/modify:**

6. `src/lib/audit-engine.ts` — Historical transaction auditor
   - Pull ALL invoices, bills, expenses, bank transactions
   - Cross-reference: invoices vs payments received
   - Cross-reference: bills vs payments made
   - Find: duplicate transactions, missing entries, uncategorized items
   - Find: bank transactions not matched to any invoice/bill
   - Find: overdue invoices not followed up
   - Generate audit report with severity levels

7. `src/app/api/audit/run/route.ts` — Trigger full audit
8. `src/app/api/audit/results/route.ts` — Get audit findings
9. `src/app/audit/page.tsx` — Audit dashboard UI

## Phase 3: Claude AI Write Tools
**Files to modify:**

10. `src/lib/prompts.ts` — Add write tool definitions:
    - `list_invoices` — Search/filter all invoices
    - `list_bills` — Search/filter all bills
    - `list_expenses` — Search/filter all expenses
    - `list_bank_transactions` — Search/filter bank transactions
    - `list_contacts` — Search/filter contacts
    - `create_invoice` — Create new invoice
    - `create_bill` — Record new bill
    - `create_expense` — Record new expense
    - `create_payment` — Record customer/vendor payment
    - `create_journal_entry` — Create journal entry
    - `update_transaction_category` — Categorize a transaction
    - `match_bank_transaction` — Match bank txn to invoice/bill
    - `send_invoice` — Email invoice to customer
    - `mark_invoice_paid` — Mark invoice as paid
    - `run_audit` — Trigger full audit scan

11. `src/lib/zoho-mcp.ts` → rename to `src/lib/tool-executor.ts`
    - Instead of mapping to MCP tools, execute Zoho API calls directly
    - Handle both read (list/get) and write (create/update) operations
    - Validate inputs before executing writes
    - Log every write action to AuditLog

12. `src/app/api/chat/route.ts` — Upgrade tool execution loop
    - Actually execute tools (not just return instructions)
    - For write operations: execute, log, return result to Claude
    - For read operations: fetch from Zoho API, return to Claude
    - Handle errors gracefully

## Phase 4: Smart Categorization & Rules Engine
**Files to create:**

13. `src/lib/categorization-engine.ts`
    - Trucking-specific expense categories:
      - Fuel & Gas
      - Vehicle Maintenance & Repairs
      - Insurance (Vehicle, Cargo, Liability)
      - Driver Pay & Benefits
      - Permits & Licenses
      - Tolls & Highway Fees
      - Truck Payments / Leases
      - Office & Admin
      - Professional Services
    - Pattern matching: vendor name -> category
    - Learn from user corrections
    - Store rules in BookkeepingRule table

14. `src/lib/reconciliation-engine.ts`
    - Auto-match bank transactions to invoices/bills
    - Fuzzy matching on amounts, dates, references
    - Confidence scoring (high/medium/low)
    - Auto-reconcile high confidence, ask user for low confidence

## Phase 5: Autonomous Workflow
**Files to create/modify:**

15. `src/lib/autonomous-bookkeeper.ts` — Main orchestrator
    - Daily/weekly task scheduler
    - Auto-categorize new bank transactions
    - Auto-create invoices from recurring patterns
    - Flag anomalies (unusual amounts, new vendors, etc.)
    - Generate weekly financial summary
    - Queue questions for user when unsure

16. `src/app/api/bookkeeper/tasks/route.ts` — Task management
17. `src/app/api/bookkeeper/questions/route.ts` — Questions queue
18. `src/app/bookkeeper/page.tsx` — Autonomous bookkeeper dashboard
    - Shows pending tasks
    - Shows questions for user
    - Shows recent actions taken
    - Shows audit findings

## Phase 6: Enhanced UI
**Files to modify:**

19. Update `src/app/page.tsx` (Dashboard) — Show real financial data
20. Update `src/app/transactions/page.tsx` — Real transaction list with categorization
21. Update `src/app/reports/page.tsx` — Reports from real data
22. Update `src/app/reconciliation/page.tsx` — Real reconciliation workflow
23. Update `src/components/layout/Sidebar.tsx` — Add Audit & Bookkeeper nav items

## Implementation Order
1. Phase 1 first (OAuth + API) — foundation for everything
2. Phase 2 (Audit) — immediate value, shows what Claude can find
3. Phase 3 (Write tools) — enables Claude to take action
4. Phase 4 (Categorization) — smart automation
5. Phase 5 (Autonomous) — full autopilot
6. Phase 6 (UI) — polish

## Zoho Books API Setup Required
Before building, the user needs to:
1. Go to https://api-console.zoho.com/
2. Create a "Server-based Application"
3. Set redirect URI to: http://localhost:3001/api/zoho/auth
4. Get Client ID and Client Secret
5. Required OAuth Scopes:
   - ZohoBooks.fullaccess.all (or granular scopes below)
   - ZohoBooks.invoices.CREATE, READ, UPDATE, DELETE
   - ZohoBooks.bills.CREATE, READ, UPDATE, DELETE
   - ZohoBooks.expenses.CREATE, READ, UPDATE, DELETE
   - ZohoBooks.banking.CREATE, READ, UPDATE
   - ZohoBooks.contacts.CREATE, READ, UPDATE
   - ZohoBooks.accountants.CREATE, READ
   - ZohoBooks.settings.READ

## Estimated Files: ~25 new/modified files
## Estimated New Dependencies: None (using fetch for Zoho API)
