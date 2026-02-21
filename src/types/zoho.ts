export interface ZohoInvoice {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_id: string;
  status: string;
  date: string;
  due_date: string;
  total: number;
  balance: number;
  currency_code: string;
  line_items?: ZohoLineItem[];
}

export interface ZohoBill {
  bill_id: string;
  bill_number: string;
  vendor_name: string;
  vendor_id: string;
  status: string;
  date: string;
  due_date: string;
  total: number;
  balance: number;
  line_items?: ZohoLineItem[];
}

export interface ZohoExpense {
  expense_id: string;
  date: string;
  account_name: string;
  total: number;
  description: string;
  category_name: string;
  vendor_name: string;
}

export interface ZohoBankTransaction {
  transaction_id: string;
  date: string;
  amount: number;
  transaction_type: string;
  description: string;
  reference_number: string;
  status: string;
  account_id: string;
}

export interface ZohoBankAccount {
  account_id: string;
  account_name: string;
  account_type: string;
  balance: number;
  currency_code: string;
  bank_name: string;
}

export interface ZohoContact {
  contact_id: string;
  contact_name: string;
  contact_type: string;
  outstanding_receivable_amount: number;
  outstanding_payable_amount: number;
  unused_credits_receivable_amount: number;
}

export interface ZohoLineItem {
  line_item_id: string;
  item_id: string;
  name: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  tax_id?: string;
}

export interface ZohoOrganization {
  organization_id: string;
  name: string;
  fiscal_year_start_month: number;
  currency_code: string;
  address?: {
    street_address1: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
}

export interface ZohoCustomerPayment {
  payment_id: string;
  payment_number: string;
  customer_name: string;
  date: string;
  amount: number;
  invoice_numbers: string;
}

export interface ZohoVendorPayment {
  payment_id: string;
  payment_number: string;
  vendor_name: string;
  date: string;
  amount: number;
  bill_numbers: string;
}
