"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { reportsApi } from "@/lib/api";
import { REPORT_TYPES } from "@/lib/constants";
import ReactMarkdown from "react-markdown";
import {
  FileBarChart,
  TrendingUp,
  Receipt,
  Clock,
  Users,
  ArrowUpDown,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Zap,
} from "lucide-react";
import type { ReportType } from "@/types/reports";

const REPORT_ICONS: Record<string, React.ReactNode> = {
  pnl: <TrendingUp className="w-5 h-5" />,
  expense: <Receipt className="w-5 h-5" />,
  aging: <Clock className="w-5 h-5" />,
  vendor: <Users className="w-5 h-5" />,
  cashflow: <ArrowUpDown className="w-5 h-5" />,
  custom: <Sparkles className="w-5 h-5" />,
};

interface SavedReport {
  id: string;
  title: string;
  reportType: string;
  dateRange: string;
  content: string;
  summary: string;
  createdAt: string;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<ReportType>("pnl");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<string>("");
  const [liveData, setLiveData] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    loadSavedReports();
    // Set default date range to current month
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateRange({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
  }, []);

  async function loadSavedReports() {
    try {
      const data = await reportsApi.saved();
      setSavedReports(data as unknown as SavedReport[]);
    } catch {
      // Silently fail
    }
  }

  async function generateReport() {
    setGenerating(true);
    setReport("");
    setLiveData(false);
    try {
      const data = await reportsApi.generate({
        reportType: selectedType,
        dateRange,
      });
      const result = data as { content: string; liveData?: boolean };
      setReport(result.content);
      setLiveData(result.liveData || false);
      loadSavedReports();
      toast.success("Report generated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  // Quick date range presets
  function setPreset(preset: string) {
    const now = new Date();
    let start: Date;
    let end = now;

    switch (preset) {
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "thisQuarter": {
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1);
        end = new Date(now.getFullYear(), q * 3 + 3, 0);
        break;
      }
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case "lastYear":
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    setDateRange({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI-generated financial analysis and reports with live Zoho Books data
        </p>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(REPORT_TYPES).map(([key, { label, description }]) => (
          <button
            key={key}
            onClick={() => setSelectedType(key as ReportType)}
            className={`
              card text-left transition-all
              ${selectedType === key
                ? "ring-2 ring-primary-500 border-primary-200 bg-primary-50"
                : "hover:border-gray-300"
              }
            `}
          >
            <div className={`mb-2 ${selectedType === key ? "text-primary-600" : "text-gray-400"}`}>
              {REPORT_ICONS[key]}
            </div>
            <div className="text-sm font-medium text-gray-900">{label}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{description}</div>
          </button>
        ))}
      </div>

      {/* Date Range & Generate */}
      <div className="card">
        <div className="flex flex-col gap-4">
          {/* Date Presets */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center mr-1">Quick:</span>
            {[
              { id: "thisMonth", label: "This Month" },
              { id: "lastMonth", label: "Last Month" },
              { id: "thisQuarter", label: "This Quarter" },
              { id: "thisYear", label: "This Year" },
              { id: "lastYear", label: "Last Year" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
            <button
              onClick={generateReport}
              disabled={generating}
              className="btn-primary"
            >
              {generating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generating ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>
      </div>

      {/* Generating State */}
      {generating && (
        <div className="card">
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-primary-500 mx-auto mb-3 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900">Generating Report</h3>
            <p className="text-sm text-gray-500 mt-1">
              AI is analyzing your financial data and creating the report...
            </p>
          </div>
        </div>
      )}

      {/* Generated Report */}
      {report && !generating && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
            <FileBarChart className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {REPORT_TYPES[selectedType].label}
            </h2>
            <span className="text-xs text-gray-400 ml-2">
              {dateRange.start} to {dateRange.end}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {liveData ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <Zap className="w-3 h-3" />
                  Live Data
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  Template
                </span>
              )}
            </div>
          </div>
          <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-table:text-sm">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Saved Reports */}
      <div className="card">
        <button
          onClick={() => setShowSaved(!showSaved)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">
              Saved Reports ({savedReports.length})
            </h2>
          </div>
          {showSaved ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showSaved && (
          <div className="mt-4 divide-y divide-gray-100">
            {savedReports.length === 0 ? (
              <p className="py-4 text-sm text-gray-500 text-center">
                No saved reports yet. Generate a report above.
              </p>
            ) : (
              savedReports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setReport(r.content);
                    setLiveData(false);
                  }}
                  className="w-full text-left py-3 hover:bg-gray-50 transition-colors rounded-lg px-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{r.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{r.dateRange}</div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
