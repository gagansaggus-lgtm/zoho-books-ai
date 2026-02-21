"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: {
        success: (msg: string) => console.log("Success:", msg),
        error: (msg: string) => console.error("Error:", msg),
        info: (msg: string) => console.info("Info:", msg),
      },
    };
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (message: string) => addToast("success", message),
    error: (message: string) => addToast("error", message),
    info: (message: string) => addToast("info", message),
  };

  const typeStyles: Record<ToastType, { bg: string; icon: string }> = {
    success: { bg: "bg-green-600", icon: "check-circle" },
    error: { bg: "bg-red-600", icon: "x-circle" },
    info: { bg: "bg-blue-600", icon: "info" },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
        {toasts.map((t) => {
          const style = typeStyles[t.type];
          return (
            <div
              key={t.id}
              className={`
                ${style.bg} text-white px-4 py-3 rounded-lg shadow-lg
                flex items-center gap-3 min-w-[280px]
                animate-slide-in cursor-pointer
                hover:opacity-90 transition-opacity
              `}
              onClick={() => removeToast(t.id)}
            >
              <span className="text-sm font-medium flex-1">{t.message}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeToast(t.id); }}
                className="text-white/70 hover:text-white text-lg leading-none"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
