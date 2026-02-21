"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { settingsApi } from "@/lib/api";
import {
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Link2,
  Unlink,
  ExternalLink,
  Shield,
} from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"untested" | "success" | "error">("untested");

  // Zoho OAuth state
  const [zohoConnected, setZohoConnected] = useState(false);
  const [zohoChecking, setZohoChecking] = useState(true);
  const [zohoConnecting, setZohoConnecting] = useState(false);
  const [zohoClientId, setZohoClientId] = useState("");
  const [zohoClientSecret, setZohoClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState("");

  const [form, setForm] = useState({
    zohoOrgId: "",
    anthropicApiKey: "",
    aiModel: "claude-sonnet-4-20250514",
    aiTemperature: 0.3,
    cacheMinutes: 15,
    currency: "CAD",
    fiscalYearStart: "01",
  });

  useEffect(() => {
    loadSettings();
    checkZohoConnection();

    // Check for OAuth callback messages in URL
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    if (success) {
      toast.success(success);
      window.history.replaceState({}, "", "/settings");
      checkZohoConnection();
    }
    if (error) {
      toast.error(error);
      window.history.replaceState({}, "", "/settings");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    try {
      const settings = await settingsApi.get();
      setForm({
        zohoOrgId: (settings.zohoOrgId as string) || "",
        anthropicApiKey: (settings.anthropicApiKey as string) || "",
        aiModel: (settings.aiModel as string) || "claude-sonnet-4-20250514",
        aiTemperature: (settings.aiTemperature as number) || 0.3,
        cacheMinutes: (settings.cacheMinutes as number) || 15,
        currency: (settings.currency as string) || "CAD",
        fiscalYearStart: (settings.fiscalYearStart as string) || "01",
      });
      if (settings.redirectUri) {
        setRedirectUri(settings.redirectUri as string);
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function checkZohoConnection() {
    setZohoChecking(true);
    try {
      const res = await fetch("/api/zoho/auth/status");
      const data = await res.json();
      setZohoConnected(data.connected);
    } catch {
      setZohoConnected(false);
    } finally {
      setZohoChecking(false);
    }
  }

  async function connectZoho() {
    if (!zohoClientId || !zohoClientSecret) {
      toast.error("Please enter Client ID and Client Secret");
      return;
    }
    setZohoConnecting(true);
    try {
      const res = await fetch("/api/zoho/auth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: zohoClientId,
          clientSecret: zohoClientSecret,
        }),
      });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || "Failed to get authorization URL");
      }
    } catch {
      toast.error("Failed to connect to Zoho");
    } finally {
      setZohoConnecting(false);
    }
  }

  async function disconnectZoho() {
    try {
      await fetch("/api/zoho/auth/status", { method: "DELETE" });
      setZohoConnected(false);
      toast.success("Zoho Books disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await settingsApi.update(form);
      toast.success("Settings saved successfully!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setConnectionStatus("untested");
    try {
      const res = await fetch(`/api/zoho/organization?orgId=${form.zohoOrgId}`);
      if (res.ok) {
        setConnectionStatus("success");
        toast.success("Connection verified!");
      } else {
        setConnectionStatus("error");
        toast.error("Connection failed. Check your Organization ID.");
      }
    } catch {
      setConnectionStatus("error");
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your AI Bookkeeper</p>
      </div>

      {/* Zoho Books OAuth Connection */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Zoho Books OAuth Connection</h2>
          </div>
          {zohoChecking ? (
            <span className="text-sm text-gray-400">Checking...</span>
          ) : zohoConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full">
              <CheckCircle className="w-4 h-4" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-sm font-medium rounded-full">
              <AlertCircle className="w-4 h-4" />
              Not Connected
            </span>
          )}
        </div>

        {zohoConnected ? (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-800">
                Your Zoho Books account is connected with full read/write access.
                The AI bookkeeper can now create invoices, bills, expenses, payments,
                categorize transactions, and perform bank reconciliation autonomously.
              </p>
            </div>
            <button
              onClick={disconnectZoho}
              className="btn-secondary text-red-600 hover:bg-red-50"
            >
              <Unlink className="w-4 h-4" />
              Disconnect Zoho Books
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 font-medium mb-2">Setup Instructions:</p>
              <ol className="text-sm text-amber-700 list-decimal list-inside space-y-1">
                <li>
                  Go to{" "}
                  <a
                    href="https://api-console.zoho.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    Zoho API Console <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </li>
                <li>Create a <strong>Server-based Application</strong></li>
                <li>
                  Set Redirect URI to:{" "}
                  <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs select-all">
                    {redirectUri || `${window.location.origin}/api/zoho/auth`}
                  </code>
                </li>
                <li>Copy the Client ID and Client Secret below</li>
              </ol>
            </div>

            <div>
              <label className="form-label">Client ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="1000.XXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={zohoClientId}
                onChange={(e) => setZohoClientId(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Client Secret</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your Zoho Client Secret"
                value={zohoClientSecret}
                onChange={(e) => setZohoClientSecret(e.target.value)}
              />
            </div>

            <button
              onClick={connectZoho}
              disabled={!zohoClientId || !zohoClientSecret || zohoConnecting}
              className="btn-primary"
            >
              {zohoConnecting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {zohoConnecting ? "Connecting..." : "Connect to Zoho Books"}
            </button>
          </div>
        )}
      </div>

      {/* Zoho Books Organization */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Zoho Books Organization</h2>
        <div className="space-y-4">
          <div>
            <label className="form-label">Organization ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="form-input"
                placeholder="Enter your Zoho Books Organization ID"
                value={form.zohoOrgId}
                onChange={(e) => setForm({ ...form, zohoOrgId: e.target.value })}
              />
              <button
                onClick={testConnection}
                disabled={!form.zohoOrgId || testing || !zohoConnected}
                className="btn-secondary whitespace-nowrap"
              >
                {testing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : connectionStatus === "success" ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : connectionStatus === "error" ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : null}
                Test
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Find this in Zoho Books under Settings &gt; Organization Profile
            </p>
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="form-label">Anthropic API Key</label>
            <input
              type="password"
              className="form-input"
              placeholder="sk-ant-..."
              value={form.anthropicApiKey}
              onChange={(e) => setForm({ ...form, anthropicApiKey: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">
              Stored locally. Never sent to Zoho.
            </p>
          </div>

          <div>
            <label className="form-label">AI Model</label>
            <select
              className="form-select"
              value={form.aiModel}
              onChange={(e) => setForm({ ...form, aiModel: e.target.value })}
            >
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Faster)</option>
              <option value="claude-opus-4-6">Claude Opus 4.6 (Most capable)</option>
            </select>
          </div>

          <div>
            <label className="form-label">
              AI Temperature: {form.aiTemperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              className="w-full accent-primary-600"
              value={form.aiTemperature}
              onChange={(e) => setForm({ ...form, aiTemperature: parseFloat(e.target.value) })}
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Precise (0)</span>
              <span>Creative (1)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Cache Duration (minutes)</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="60"
              value={form.cacheMinutes}
              onChange={(e) => setForm({ ...form, cacheMinutes: parseInt(e.target.value) || 15 })}
            />
          </div>
          <div>
            <label className="form-label">Currency</label>
            <select
              className="form-select"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="CAD">CAD ($)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="INR">INR</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
          <div>
            <label className="form-label">Fiscal Year Start</label>
            <select
              className="form-select"
              value={form.fiscalYearStart}
              onChange={(e) => setForm({ ...form, fiscalYearStart: e.target.value })}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const month = String(i + 1).padStart(2, "0");
                const name = new Date(2024, i).toLocaleString("en", { month: "long" });
                return <option key={month} value={month}>{name}</option>;
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
