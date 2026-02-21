"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  Search,
  Filter,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Receipt,
  FileText,
  CreditCard,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface Transaction {
  id: string;
  type: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  balance: number;
  status: string;
  contactName: string;
  accountName: string;
  direction: "inflow" | "outflow";
}

interface FlaggedItem {
  id: string;
  transactionId: string;
  reason: string;
  severity: string;
  resolved: boolean;
}

interface BankAccount {
  id: string;
  name: string;
  balance: number;
  type: string;
}

interface TransactionsData {
  transactions: Transaction[];
  totalCount: number;
  summary: {
    totalInflow: number;
    totalOutflow: number;
    net: number;
    inflowCount: number;
    outflowCount: number;
  };
  flagged: FlaggedItem[];
  bankAccounts: BankAccount[];
}

function fmt(amount: number, currency = "CAD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function typeIcon(type: string) {
  switch (type) {
    case "invoice":
      return <FileText className="w-4 h-4 text-blue-500" />;
    case "bill":
      return <Receipt className="w-4 h-4 text-red-500" />;
    case "expense":
      return <CreditCard className="w-4 h-4 text-amber-500" />;
    case "bank_transaction":
      return <ArrowLeftRight className="w-4 h-4 text-gray-500" />;
    default:
      return <DollarSign className="w-4 h-4 text-gray-400" />;
  }
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-800",
    sent: "bg-blue-100 text-blue-800",
    overdue: "bg-red-100 text-red-800",
    partially_paid: "bg-amber-100 text-amber-800",
    draft: "bg-gray-100 text-gray-600",
    open: "bg-blue-100 text-blue-800",
    recorded: "bg-gray-100 text-gray-600",
    categorized: "bg-emerald-100 text-emerald-800",
    uncategorized: "bg-amber-100 text-amber-800",
    void: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

export default function TransactionsPage() {
  const [data, setData] = useState<TransactionsData | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("CAD");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFlagged, setShowFlagged] = useState(false);
  const [bankAccountId, setBankAccountId] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions(type?: string, accountId?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (accountId) params.set("accountId", accountId);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/transactions?${params}`);
      const json = await res.json();
      setConnected(json.connected);
      setData(json.data);
      if (json.currency) setCurrency(json.currency);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(type: string) {
    setFilterType(type);
    if (type === "bank" && bankAccountId) {
      fetchTransactions("bank", bankAccountId);
    } else if (type !== "bank") {
      fetchTransactions(type);
    }
  }

  function handleBankAccountChange(id: string) {
    setBankAccountId(id);
    if (filterType === "bank" && id) {
      fetchTransactions("bank", id);
    }
  }

  // Filter transactions by search query
  const filtered = data?.transactions.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.description.toLowerCase().includes(q) ||
      t.reference?.toString().toLowerCase().includes(q) ||
      t.contactName?.toLowerCase().includes(q) ||
      t.accountName?.toLowerCase().includes(q)
    );
  }) || [];

  const unflaggedItems = data?.flagged.filter((f) => !f.resolved) || [];
  const s = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">
            {connected
              ? `${data?.totalCount || 0} transactions loaded from Zoho Books`
              : "Connect Zoho Books to view transactions"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchTransactions(filterType === "bank" ? "bank" : filterType, bankAccountId)}
            className="btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/chat" className="btn-primary">
            <MessageSquare className="w-4 h-4" />
            Analyze with AI
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      {connected && s && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card border-l-4 border-l-green-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Inflows</p>
                <p className="text-xl font-bold text-green-600 mt-1">{fmt(s.totalInflow, currency)}</p>
                <p className="text-xs text-gray-400 mt-1">{s.inflowCount} transactions</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="card border-l-4 border-l-red-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Outflows</p>
                <p className="text-xl font-bold text-red-600 mt-1">{fmt(s.totalOutflow, currency)}</p>
                <p className="text-xs text-gray-400 mt-1">{s.outflowCount} transactions</p>
              </div>
              <ArrowDownRight className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <div className="card border-l-4 border-l-blue-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Net</p>
                <p className={`text-xl font-bold mt-1 ${s.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {fmt(s.net, currency)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Inflows minus outflows</p>
              </div>
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="card border-l-4 border-l-amber-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">AI Flags</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{unflaggedItems.length}</p>
                <p className="text-xs text-gray-400 mt-1">Unresolved items</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>
      )}

      {/* Flagged Transactions Alert */}
      {connected && unflaggedItems.length > 0 && (
        <div className="card bg-amber-50 border-amber-200">
          <button
            onClick={() => setShowFlagged(!showFlagged)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <h3 className="font-medium text-amber-900">
                  {unflaggedItems.length} Flagged Transaction{unflaggedItems.length !== 1 ? "s" : ""}
                </h3>
                <p className="text-sm text-amber-700 mt-0.5">
                  AI has identified items requiring attention
                </p>
              </div>
            </div>
            {showFlagged ? (
              <ChevronUp className="w-5 h-5 text-amber-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-amber-600" />
            )}
          </button>
          {showFlagged && (
            <div className="mt-3 space-y-2">
              {unflaggedItems.map((f) => (
                <div key={f.id} className="flex items-center gap-3 py-2 px-3 bg-white rounded-lg border border-amber-100">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    f.severity === "critical" ? "bg-red-500" : f.severity === "warning" ? "bg-amber-500" : "bg-blue-400"
                  }`} />
                  <span className="text-sm text-gray-700 flex-1">{f.reason}</span>
                  <span className="text-xs text-gray-400">{f.transactionId}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by description, reference, vendor..."
              className="form-input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              className="form-select"
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="invoices">Invoices</option>
              <option value="bills">Bills</option>
              <option value="expenses">Expenses</option>
              <option value="bank">Bank Transactions</option>
            </select>
            {filterType === "bank" && data?.bankAccounts && (
              <select
                className="form-select"
                value={bankAccountId}
                onChange={(e) => handleBankAccountChange(e.target.value)}
              >
                <option value="">Select Bank Account</option>
                {data.bankAccounts.map((acct) => (
                  <option key={acct.id} value={acct.id}>
                    {acct.name}
                  </option>
                ))}
              </select>
            )}
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                fetchTransactions(filterType, bankAccountId);
              }}
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="sent">Sent</option>
              <option value="overdue">Overdue</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="draft">Draft</option>
              <option value="open">Open</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {!connected ? (
        <div className="card">
          <div className="text-center py-12">
            <ArrowLeftRight className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">Connect Zoho Books</h3>
            <p className="text-sm text-gray-500 mt-1">
              Configure your Zoho Books connection in Settings to view transactions.
            </p>
            <div className="flex gap-2 justify-center mt-4">
              <Link href="/settings" className="btn-secondary text-sm">Go to Settings</Link>
              <Link href="/chat" className="btn-primary text-sm">Ask AI</Link>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="card">
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-300 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500">Loading transactions from Zoho Books...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <ArrowLeftRight className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No transactions found</h3>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery ? "Try a different search term." : "No transactions match the current filters."}
            </p>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Transactions ({filtered.length}{filtered.length < (data?.totalCount || 0) ? ` of ${data?.totalCount}` : ""})
            </h2>
          </div>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-3 font-medium text-gray-500 w-8"></th>
                  <th className="pb-3 font-medium text-gray-500">Date</th>
                  <th className="pb-3 font-medium text-gray-500">Description</th>
                  <th className="pb-3 font-medium text-gray-500">Reference</th>
                  <th className="pb-3 font-medium text-gray-500">Account</th>
                  <th className="pb-3 font-medium text-gray-500 text-right">Amount</th>
                  <th className="pb-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((txn) => (
                  <tr key={`${txn.type}-${txn.id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3">{typeIcon(txn.type)}</td>
                    <td className="py-3 text-gray-600 whitespace-nowrap">
                      {txn.date ? new Date(txn.date as string).toLocaleDateString("en-CA") : "--"}
                    </td>
                    <td className="py-3">
                      <div className="text-gray-900 font-medium truncate max-w-xs">{txn.description}</div>
                      {txn.contactName && (
                        <div className="text-xs text-gray-400">{txn.contactName}</div>
                      )}
                    </td>
                    <td className="py-3 text-gray-500 text-xs">{txn.reference || "--"}</td>
                    <td className="py-3 text-gray-500 text-xs truncate max-w-[120px]">{txn.accountName}</td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <span className={`font-semibold ${txn.direction === "inflow" ? "text-green-600" : "text-red-600"}`}>
                        {txn.direction === "inflow" ? "+" : "-"}{fmt(txn.amount as number, currency)}
                      </span>
                      {txn.balance > 0 && (
                        <div className="text-xs text-gray-400">Bal: {fmt(txn.balance, currency)}</div>
                      )}
                    </td>
                    <td className="py-3">{statusBadge(txn.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
