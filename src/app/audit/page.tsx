"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Play,
  RefreshCw,
  CheckCircle,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AuditFinding {
  id: string;
  findingType: string;
  severity: string;
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  amount: number;
  status: string;
  resolution: string;
  createdAt: string;
  resolvedAt: string | null;
}

interface AuditSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  open: number;
  resolved: number;
}

export default function AuditPage() {
  const { toast } = useToast();
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  useEffect(() => {
    loadFindings();
  }, [filterSeverity, filterStatus]);

  async function loadFindings() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSeverity) params.set("severity", filterSeverity);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/audit/results?${params.toString()}`);
      const data = await res.json();
      setFindings(data.findings || []);
      setSummary(data.summary || null);
    } catch {
      toast.error("Failed to load audit findings");
    } finally {
      setLoading(false);
    }
  }

  async function runAudit() {
    setRunning(true);
    toast.info("Starting full audit... This may take a few minutes.");
    try {
      const res = await fetch("/api/audit/run", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(
          `Audit complete! Found ${data.summary.totalFindings} findings (${data.summary.critical} critical, ${data.summary.warning} warnings)`
        );
        loadFindings();
      }
    } catch {
      toast.error("Audit failed. Check your connections.");
    } finally {
      setRunning(false);
    }
  }

  async function resolveFinding(findingId: string) {
    if (!resolutionText.trim()) {
      toast.error("Please enter a resolution note");
      return;
    }
    try {
      const res = await fetch("/api/audit/results", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId, resolution: resolutionText }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Finding resolved");
        setResolving(null);
        setResolutionText("");
        loadFindings();
      }
    } catch {
      toast.error("Failed to resolve finding");
    }
  }

  function getSeverityIcon(severity: string) {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  }

  function getSeverityBadge(severity: string) {
    const classes: Record<string, string> = {
      critical: "bg-red-100 text-red-800",
      warning: "bg-amber-100 text-amber-800",
      info: "bg-blue-100 text-blue-800",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${classes[severity] || classes.info}`}>
        {severity}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            Financial Audit
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered audit of all Zoho Books transactions
          </p>
        </div>
        <button
          onClick={runAudit}
          disabled={running}
          className="btn-primary"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running Audit...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Full Audit
            </>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card !p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            <div className="text-xs text-gray-500">Total Findings</div>
          </div>
          <div className="card !p-4 text-center border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
            <div className="text-xs text-gray-500">Critical</div>
          </div>
          <div className="card !p-4 text-center border-l-4 border-amber-500">
            <div className="text-2xl font-bold text-amber-600">{summary.warning}</div>
            <div className="text-xs text-gray-500">Warnings</div>
          </div>
          <div className="card !p-4 text-center border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-blue-600">{summary.info}</div>
            <div className="text-xs text-gray-500">Info</div>
          </div>
          <div className="card !p-4 text-center border-l-4 border-emerald-500">
            <div className="text-2xl font-bold text-emerald-600">{summary.resolved}</div>
            <div className="text-xs text-gray-500">Resolved</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card !p-3 flex items-center gap-4 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          className="form-select !py-1.5 !text-sm w-40"
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
        >
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select
          className="form-select !py-1.5 !text-sm w-40"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
        {(filterSeverity || filterStatus) && (
          <button
            onClick={() => { setFilterSeverity(""); setFilterStatus(""); }}
            className="text-xs text-primary-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Findings List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : findings.length === 0 ? (
        <div className="card text-center py-16">
          <ShieldCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {summary ? "No findings match your filters" : "No audit has been run yet"}
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            {summary
              ? "Try adjusting your filters to see more results."
              : "Click \"Run Full Audit\" to analyze all your Zoho Books data for discrepancies, duplicates, and issues."}
          </p>
          {!summary && (
            <button onClick={runAudit} disabled={running} className="btn-primary mx-auto">
              <Play className="w-4 h-4" />
              Run Your First Audit
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {findings.map((finding) => (
            <div
              key={finding.id}
              className={`card !p-4 transition-all ${
                finding.status === "resolved" ? "opacity-60" : ""
              }`}
            >
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => setExpandedId(expandedId === finding.id ? null : finding.id)}
              >
                {getSeverityIcon(finding.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium text-gray-900">{finding.title}</h3>
                    {getSeverityBadge(finding.severity)}
                    {finding.status === "resolved" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        resolved
                      </span>
                    )}
                    {finding.amount > 0 && (
                      <span className="text-sm font-semibold text-gray-700">
                        ${finding.amount.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="capitalize">{finding.findingType.replace(/_/g, " ")}</span>
                    {finding.entityType && (
                      <span className="capitalize">{finding.entityType}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(finding.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {expandedId === finding.id ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </div>

              {expandedId === finding.id && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{finding.description}</p>

                  {finding.entityId && (
                    <p className="text-xs text-gray-400 mt-2">
                      Entity ID: <code className="bg-gray-100 px-1 rounded">{finding.entityId}</code>
                    </p>
                  )}

                  {finding.status === "resolved" ? (
                    <div className="mt-3 bg-emerald-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 mb-1">
                        <CheckCircle className="w-4 h-4" />
                        Resolved
                        {finding.resolvedAt && (
                          <span className="text-xs text-emerald-600">
                            on {new Date(finding.resolvedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-emerald-700">{finding.resolution}</p>
                    </div>
                  ) : resolving === finding.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="form-input !text-sm"
                        rows={2}
                        placeholder="Enter resolution notes..."
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => resolveFinding(finding.id)}
                          className="btn-primary !py-1.5 !text-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Mark Resolved
                        </button>
                        <button
                          onClick={() => { setResolving(null); setResolutionText(""); }}
                          className="btn-secondary !py-1.5 !text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setResolving(finding.id);
                      }}
                      className="mt-3 btn-secondary !py-1.5 !text-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
