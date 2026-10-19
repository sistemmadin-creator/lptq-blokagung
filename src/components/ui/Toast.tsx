"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

interface ToastMessage {
  id: string;
  type: "success" | "error";
  text: string;
}

interface ToastContextValue {
  showToast: (type: "success" | "error", text: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none no-print"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-md border p-3.5 shadow-md ${
              t.type === "success"
                ? "bg-emerald-900 text-white border-emerald-700"
                : "bg-red-900 text-white border-red-700"
            }`}
          >
            <div className="flex items-center gap-2.5 text-sm font-medium">
              {t.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-red-300" />
              )}
              <span>{t.text}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label="Tutup pesan"
              className="min-h-[28px] min-w-[28px] flex items-center justify-center rounded hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast harus dipanggil di dalam ToastProvider");
  }
  return ctx;
}
