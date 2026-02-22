"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  ArrowLeftRight,
  FileBarChart,
  CheckCircle,
  Settings,
  BookOpen,
  Menu,
  X,
  ShieldCheck,
  LogOut,
} from "lucide-react";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Financial overview",
  },
  {
    href: "/chat",
    label: "AI Chat",
    icon: MessageSquare,
    description: "Ask about your finances",
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: ArrowLeftRight,
    description: "Bank transactions",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: FileBarChart,
    description: "Financial reports",
  },
  {
    href: "/audit",
    label: "Audit",
    icon: ShieldCheck,
    description: "Find discrepancies",
  },
  {
    href: "/reconciliation",
    label: "Reconciliation",
    icon: CheckCircle,
    description: "Match transactions",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "App configuration",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden bg-white p-2 rounded-lg shadow-lg border border-gray-200"
        aria-label="Open navigation"
      >
        <Menu className="w-6 h-6" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          flex flex-col
        `}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary-600" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">AI Bookkeeper</h1>
              <p className="text-[10px] text-gray-500 -mt-1">Zoho Books + AI</p>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto md:hidden p-1 rounded hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200 group
                  ${
                    isActive
                      ? "bg-primary-50 text-primary-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary-600" : "text-gray-400 group-hover:text-gray-600"}`} />
                <div>
                  <div className="text-sm">{item.label}</div>
                  <div className={`text-[11px] ${isActive ? "text-primary-500" : "text-gray-400"}`}>
                    {item.description}
                  </div>
                </div>
                {isActive && (
                  <div className="ml-auto w-1 h-8 bg-primary-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">
              Powered by
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-xs text-gray-600">Claude AI + Zoho Books</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </aside>
    </>
  );
}
