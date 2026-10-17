"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { X } from "lucide-react";

interface Toast { id: number; message: string; tone: "info" | "success" | "error" }
const ToastCtx = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-16 right-4 z-[100] flex w-72 flex-col gap-2 md:bottom-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="panel flex items-start gap-2 border-l-2 px-3 py-2 text-xs shadow-lg"
            style={{
              borderLeftColor:
                t.tone === "error" ? "var(--accent)" : t.tone === "success" ? "var(--ok)" : "var(--ink-3)",
            }}
          >
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              aria-label="Dismiss"
              className="text-[var(--ink-3)] hover:text-[var(--ink)]"
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
