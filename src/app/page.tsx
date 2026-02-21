"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Receipt,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  RefreshCw,
  Wallet,
  ShieldCheck,
  Play,
  Bot,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  metrics: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    outstanding: number;
    overdueAmount: number;
    overdueCount: number;
    cashInBank: number;
  };
  recentInvoices: Array<{
    id: string;
    number: string;
    customer: string;
    amount: number;
    balance: number;
    status: string;
    date: string;
    dueDate: string;
  }>;
  recentExpenses: Array<{
    id: string;
    account: string;
    vendor: string;
    amount: number;
    date: string;
  }>;
  bankAccounts: Array<{
    id: string;
    name: string;
    balance: number;
    type: string;
  }>;
  auditFindings: Array<{
    id: string;
    title: string;
    severity: string;
    type: string;
  }>;
  counts: {
    invoices: number;
    bills: number;
    expenses: number;
    bankAccounts: number;
  };
}

function fmt(amount: number, currency = "CAD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-800",
    sent: "bg-blue-100 text-blue-800",
    overdue: "bg-red-100 text-red-800",
    partially_paid: "bg-amber-100 text-amber-800",
    draft: "bg-gray-100 text-gray-600",
    open: "bg-blue-100 text-blue-800",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${colors[status] || "bg-gray-100 text-gray-600"}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("CAD");

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
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

  const m = data?.metrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {connected ? "Live data from Zoho Books" : "Connect Zoho Books to see live data"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchDashboard} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/chat" className="btn-primary">
            <MessageSquare className="w-4 h-4" />
            Ask AI
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card border-l-4 border-l-emerald-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {loading ? "..." : m ? fmt(m.totalRevenue, currency) : "--"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {data ? `${data.counts.invoices} invoices` : "Connect to see data"}
              </p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-red-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {loading ? "..." : m ? fmt(m.totalExpenses, currency) : "--"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {data ? `${data.counts.expenses} expenses + ${data.counts.bills} bills` : "Connect to see data"}
              </p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <Receipt className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Net Profit</p>
              <p className={`text-2xl font-bold mt-1 ${m && m.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {loading ? "..." : m ? fmt(m.netProfit, currency) : "--"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Revenue minus expenses</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card border-l-4 border-l-amber-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {loading ? "..." : m ? fmt(m.outstanding, currency) : "--"}
              </p>
              <p className="text-xs mt-1">
                {m && m.overdueCount > 0 ? (
                  <span className="text-red-500 font-medium">{m.overdueCount} overdue ({fmt(m.overdueAmount, currency)})</span>
                ) : (
                  <span className="text-gray-400">No overdue invoices</span>
                )}
              </p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
            <Link href="/chat" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Analyze <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {!connected ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Connect Zoho Books in <Link href="/settings" className="text-primary-600 hover:underline">Settings</Link> to see invoices.
              </p>
            </div>
          ) : data?.recentInvoices.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No invoices found.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data?.recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{inv.number}</div>
                    <div className="text-xs text-gray-500">{inv.customer}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{fmt(inv.amount, currency)}</div>
                    <div className="mt-0.5">{statusBadge(inv.status)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cash Flow + Bank Accounts */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">Revenue</span>
                </div>
                <span className="font-semibold text-green-600">
                  {m ? fmt(m.totalRevenue, currency) : "--"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-gray-700">Expenses</span>
                </div>
                <span className="font-semibold text-red-600">
                  {m ? fmt(m.totalExpenses, currency) : "--"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-t-2 border-gray-200">
                <span className="text-sm font-medium text-gray-700">Net</span>
                <span className={`font-bold ${m && m.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {m ? fmt(m.netProfit, currency) : "--"}
                </span>
              </div>
            </div>
          </div>

          {/* Bank Accounts */}
          {connected && data?.bankAccounts && data.bankAccounts.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-gray-400" />
                Bank Accounts
              </h2>
              <div className="space-y-2">
                {data.bankAccounts.map((acct) => (
                  <div key={acct.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700 truncate">{acct.name}</span>
                    <span className="text-sm font-semibold text-gray-900">{fmt(acct.balance, currency)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 px-3 bg-primary-50 rounded-lg">
                  <span className="text-sm font-medium text-primary-700">Total Cash</span>
                  <span className="text-sm font-bold text-primary-700">{fmt(m?.cashInBank || 0, currency)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audit Findings Alert */}
      {connected && data?.auditFindings && data.auditFindings.length > 0 && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-900">Open Audit Findings</h3>
              <div className="mt-2 space-y-1">
                {data.auditFindings.map((f) => (
                  <div key={f.id} className="text-sm text-amber-700 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${f.severity === "critical" ? "bg-red-500" : f.severity === "warning" ? "bg-amber-500" : "bg-blue-400"}`} />
                    {f.title}
                  </div>
                ))}
              </div>
              <Link href="/audit" className="text-sm text-amber-800 font-medium hover:underline mt-2 inline-block">
                View all findings &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* AI Bookkeeper Actions */}
      <div className="card bg-gradient-to-r from-primary-50 to-emerald-50 border-primary-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Bot className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">AI Autonomous Bookkeeper</h2>
            <p className="text-sm text-gray-600 mt-1">
              {connected
                ? "Your AI bookkeeper is ready. It can categorize transactions, reconcile bank accounts, audit for discrepancies, and manage invoices/bills autonomously."
                : "Connect your Zoho Books account to enable autonomous bookkeeping."}
            </p>
            <div className="flex gap-2 mt-3">
              <Link href="/chat" className="btn-primary text-sm">
                <MessageSquare className="w-3.5 h-3.5" />
                Chat with AI
              </Link>
              <Link href="/audit" className="btn-secondary text-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                Run Audit
              </Link>
              {!connected && (
                <Link href="/settings" className="btn-secondary text-sm">
                  Configure
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
