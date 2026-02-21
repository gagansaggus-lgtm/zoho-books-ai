import * as zoho from "@/lib/zoho-api";

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function executeToolCall(
  toolName: string,
  input: Record<string, unknown>,
  aiInitiated = true
): Promise<ToolResult> {
  try {
    switch (toolName) {
      // =============== LIST (READ ALL) ===============
      case "list_invoices":
        return { success: true, data: await zoho.listInvoices(toStringParams(input), aiInitiated) };

      case "list_bills":
        return { success: true, data: await zoho.listBills(toStringParams(input), aiInitiated) };

      case "list_expenses":
        return { success: true, data: await zoho.listExpenses(toStringParams(input), aiInitiated) };

      case "list_contacts":
        return { success: true, data: await zoho.listContacts(toStringParams(input), aiInitiated) };

      case "list_bank_accounts":
        return { success: true, data: await zoho.listBankAccounts(toStringParams(input), aiInitiated) };

      case "list_bank_transactions": {
        const accountId = String(input.account_id || "");
        return { success: true, data: await zoho.listBankTransactions(accountId, toStringParams(input), aiInitiated) };
      }

      case "list_chart_of_accounts":
        return { success: true, data: await zoho.listChartOfAccounts(toStringParams(input), aiInitiated) };

      case "list_journals":
        return { success: true, data: await zoho.listJournals(toStringParams(input), aiInitiated) };

      case "list_customer_payments":
        return { success: true, data: await zoho.listCustomerPayments(toStringParams(input), aiInitiated) };

      case "list_vendor_payments":
        return { success: true, data: await zoho.listVendorPayments(toStringParams(input), aiInitiated) };

      case "list_credit_notes":
        return { success: true, data: await zoho.listCreditNotes(toStringParams(input), aiInitiated) };

      case "list_items":
        return { success: true, data: await zoho.listItems(toStringParams(input), aiInitiated) };

      case "list_taxes":
        return { success: true, data: await zoho.listTaxes(aiInitiated) };

      // =============== GET SINGLE RECORD ===============
      case "get_invoice":
        return { success: true, data: await zoho.getInvoice(String(input.invoice_id), aiInitiated) };

      case "get_bill":
        return { success: true, data: await zoho.getBill(String(input.bill_id), aiInitiated) };

      case "get_expense":
        return { success: true, data: await zoho.getExpense(String(input.expense_id), aiInitiated) };

      case "get_contact":
        return { success: true, data: await zoho.getContact(String(input.contact_id), aiInitiated) };

      case "get_bank_account":
        return { success: true, data: await zoho.getBankAccount(String(input.account_id), aiInitiated) };

      case "get_organization":
        return { success: true, data: await zoho.getOrganization(aiInitiated) };

      // =============== CREATE ===============
      case "create_invoice":
        return { success: true, data: await zoho.createInvoice(input.invoice_data as Record<string, unknown>, aiInitiated) };

      case "create_bill":
        return { success: true, data: await zoho.createBill(input.bill_data as Record<string, unknown>, aiInitiated) };

      case "create_expense":
        return { success: true, data: await zoho.createExpense(input.expense_data as Record<string, unknown>, aiInitiated) };

      case "create_contact":
        return { success: true, data: await zoho.createContact(input.contact_data as Record<string, unknown>, aiInitiated) };

      case "create_customer_payment":
        return { success: true, data: await zoho.createCustomerPayment(input.payment_data as Record<string, unknown>, aiInitiated) };

      case "create_vendor_payment":
        return { success: true, data: await zoho.createVendorPayment(input.payment_data as Record<string, unknown>, aiInitiated) };

      case "create_journal_entry":
        return { success: true, data: await zoho.createJournalEntry(input.journal_data as Record<string, unknown>, aiInitiated) };

      case "create_bank_transaction":
        return { success: true, data: await zoho.createBankTransaction(input.transaction_data as Record<string, unknown>, aiInitiated) };

      // =============== UPDATE ===============
      case "update_invoice":
        return { success: true, data: await zoho.updateInvoice(String(input.invoice_id), input.invoice_data as Record<string, unknown>, aiInitiated) };

      case "update_bill":
        return { success: true, data: await zoho.updateBill(String(input.bill_id), input.bill_data as Record<string, unknown>, aiInitiated) };

      case "update_expense":
        return { success: true, data: await zoho.updateExpense(String(input.expense_id), input.expense_data as Record<string, unknown>, aiInitiated) };

      case "update_contact":
        return { success: true, data: await zoho.updateContact(String(input.contact_id), input.contact_data as Record<string, unknown>, aiInitiated) };

      // =============== ACTIONS ===============
      case "send_invoice":
        return { success: true, data: await zoho.sendInvoice(String(input.invoice_id), input.email_data as Record<string, unknown> || {}, aiInitiated) };

      case "mark_invoice_sent":
        return { success: true, data: await zoho.markInvoiceAsSent(String(input.invoice_id), aiInitiated) };

      case "categorize_transaction":
        return {
          success: true,
          data: await zoho.categorizeTransaction(
            String(input.transaction_id),
            String(input.account_id),
            input.transaction_data as Record<string, unknown> || {},
            aiInitiated
          ),
        };

      case "match_bank_transaction":
        return {
          success: true,
          data: await zoho.matchBankTransaction(
            String(input.transaction_id),
            input.match_data as Record<string, unknown>,
            aiInitiated
          ),
        };

      case "get_uncategorized_transactions":
        return { success: true, data: await zoho.getUncategorizedTransactions(String(input.account_id), aiInitiated) };

      case "get_matching_transactions":
        return { success: true, data: await zoho.getMatchingTransactions(String(input.transaction_id), aiInitiated) };

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : `Tool ${toolName} failed`,
    };
  }
}

function toStringParams(input: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && typeof value !== "object") {
      params[key] = String(value);
    }
  }
  return params;
}
