"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  RefreshCw,
  Sparkles,
  ArrowLeftRight,
  MessageSquare,
  Wallet,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  LinkIcon,
  XCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface BankAccountInfo {
  id: string;
  name: string;
  balance: number;
  type: string;
  bankName: string;
  accountNumber: string;
  uncategorizedCount: number;
}

interface MatchSuggestion {
  transactionId: string;
  transactionDescription: string;
  transactionAmount: number;
  transactionDate: string;
  matchedType: string;
  matchedId: string;
  matchedDescription: string;
  matchedAmount: number;
  confidence: number;
  reason: string;
}

function fmt(amount: number, currency = "CAD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function confidenceBadge(score: number) {
  if (score >= 0.9)
    return <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-emerald-100 text-emerald-800">High ({Math.round(score * 100)}%)</span>;
  if (score >= 0.7)
    return <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-amber-100 text-amber-800">Medium ({Math.round(score * 100)}%)</span>;
  return <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-red-100 text-red-800">Low ({Math.round(score * 100)}%)</span>;
}

export default function ReconciliationPage() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("CAD");
  const [accounts, setAccounts] = useState<BankAccountInfo[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/reconciliation/accounts");
      const json = await res.json();
      setConnected(json.connected);
      setAccounts(json.accounts || []);
      if (json.currency) setCurrency(json.currency);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  async function getSuggestions() {
    if (!selectedAccount) return;
    setSuggestionsLoading(true);
    setSuggestions([]);
    setError("");
    try {
      const res = await fetch("/api/reconciliation/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankAccountId: selectedAccount }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setSuggestions(json.suggestions || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get suggestions");
    } finally {
      setSuggestionsLoading(false);
    }
  }

  const selectedAcctInfo = accounts.find((a) => a.id === selectedAccount);
  const highConfidence = suggestions.filter((s) => s.confidence >= 0.9);
  const mediumConfidence = suggestions.filter((s) => s.confidence >= 0.7 && s.confidence < 0.9);
  const lowConfidence = suggestions.filter((s) => s.confidence < 0.7);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Reconciliation</h1>
          <p className="text-sm text-gray-500 mt-1">
            {connected
              ? "AI-assisted transaction matching and reconciliation"
              : "Connect Zoho Books to reconcile transactions"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAccounts} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/chat" className="btn-primary">
            <MessageSquare className="w-4 h-4" />
            Ask AI
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-amber-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Unmatched</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {connected ? suggestions.length || "--" : "--"}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {selectedAcctInfo ? `From ${selectedAcctInfo.name}` : "Select an account"}
              </p>
            </div>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
        </div>
        <div className="card border-l-4 border-l-green-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">High Confidence</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {suggestions.length > 0 ? highConfidence.length : "--"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Ready to match ({">"}90% confidence)</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
        </div>
        <div className="card border-l-4 border-l-blue-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Bank Accounts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{accounts.length}</p>
              <p className="text-xs text-gray-400 mt-1">
                {connected ? "Available for reconciliation" : "Connect to see accounts"}
              </p>
            </div>
            <Wallet className="w-5 h-5 text-blue-500" />
          </div>
        </div>
      </div>

      {!connected ? (
        <div className="card">
          <div className="text-center py-12">
            <ArrowLeftRight className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">Connect Zoho Books</h3>
            <p className="text-sm text-gray-500 mt-1">
              Configure your Zoho Books connection in Settings to start reconciling.
            </p>
            <div className="flex gap-2 justify-center mt-4">
              <Link href="/settings" className="btn-secondary text-sm">Go to Settings</Link>
              <Link href="/chat" className="btn-primary text-sm">Ask AI</Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Bank Account Selector */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Bank Account</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {accounts.map((acct) => (
                <button
                  key={acct.id}
                  onClick={() => setSelectedAccount(acct.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedAccount === acct.id
                      ? "ring-2 ring-primary-500 border-primary-200 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className={`w-4 h-4 ${selectedAccount === acct.id ? "text-primary-600" : "text-gray-400"}`} />
                      <span className="text-sm font-medium text-gray-900 truncate">{acct.name}</span>
                    </div>
                    {selectedAccount === acct.id && (
                      <CheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-lg font-bold text-gray-900">{fmt(acct.balance, currency)}</span>
                    {acct.bankName && (
                      <span className="text-xs text-gray-400">{acct.bankName}</span>
                    )}
                  </div>
                  {acct.accountNumber && (
                    <p className="text-xs text-gray-400 mt-1">{acct.accountNumber}</p>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={getSuggestions}
              disabled={suggestionsLoading || !selectedAccount}
              className="btn-primary"
            >
              {suggestionsLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {suggestionsLoading ? "Analyzing..." : "Get AI Match Suggestions"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Match Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Match Suggestions ({suggestions.length})
                </h2>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    High ({highConfidence.length})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Medium ({mediumConfidence.length})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Low ({lowConfidence.length})
                  </span>
                </div>
              </div>

              {suggestions.map((s) => (
                <div key={s.transactionId} className="card hover:shadow-md transition-shadow">
                  <button
                    onClick={() =>
                      setExpandedSuggestion(
                        expandedSuggestion === s.transactionId ? null : s.transactionId
                      )
                    }
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <LinkIcon className={`w-5 h-5 flex-shrink-0 ${
                          s.confidence >= 0.9 ? "text-emerald-500" : s.confidence >= 0.7 ? "text-amber-500" : "text-red-400"
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {s.transactionDescription}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {s.transactionDate ? new Date(s.transactionDate).toLocaleDateString("en-CA") : "--"}
                            <span className="text-gray-300">|</span>
                            <span className="font-medium">{fmt(s.transactionAmount, currency)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        {confidenceBadge(s.confidence)}
                        {expandedSuggestion === s.transactionId ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {expandedSuggestion === s.transactionId && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Bank Transaction */}
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Bank Transaction</p>
                          <p className="text-sm font-medium text-gray-900">{s.transactionDescription}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">
                              {s.transactionDate ? new Date(s.transactionDate).toLocaleDateString("en-CA") : "--"}
                            </span>
                            <span className="text-sm font-bold text-gray-900">{fmt(s.transactionAmount, currency)}</span>
                          </div>
                        </div>

                        {/* Suggested Match */}
                        <div className="p-3 bg-primary-50 rounded-lg">
                          <p className="text-xs font-medium text-primary-600 uppercase mb-2">
                            Suggested Match ({s.matchedType})
                          </p>
                          <p className="text-sm font-medium text-gray-900">{s.matchedDescription}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-500">ID: {s.matchedId}</span>
                            <span className="text-sm font-bold text-primary-700">{fmt(s.matchedAmount, currency)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="mt-3 p-2 bg-emerald-50 rounded text-sm text-emerald-800">
                        <span className="font-medium">AI Reasoning:</span> {s.reason}
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/chat?q=Match bank transaction ${s.transactionId} with ${s.matchedType} ${s.matchedId}`}
                          className="btn-primary text-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Apply Match via AI
                        </Link>
                        <Link
                          href={`/chat?q=Review transaction ${s.transactionId} and suggest better matches`}
                          className="btn-secondary text-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Get AI Review
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No Suggestions Yet */}
          {!suggestionsLoading && suggestions.length === 0 && !error && (
            <div className="card">
              <div className="text-center py-12">
                <ArrowLeftRight className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">Ready to reconcile</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Select a bank account above and click &quot;Get AI Match Suggestions&quot; to start.
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {suggestionsLoading && (
            <div className="card">
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-primary-500 mx-auto mb-3 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900">Analyzing Transactions</h3>
                <p className="text-sm text-gray-500 mt-1">
                  AI is scanning bank transactions and finding matches...
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
