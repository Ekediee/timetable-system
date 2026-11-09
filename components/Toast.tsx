"use client";

import { useEffect, useState, useRef } from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, X } from "lucide-react";

export type ToastType = "error" | "success" | "warn";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

type ToastListener = (toasts: ToastItem[]) => void;
let listeners: ToastListener[] = [];
let toastState: ToastItem[] = [];

const notify = () => {
  listeners.forEach((listener) => listener([...toastState]));
};

export const toast = {
  show: (message: string, type: ToastType = "error") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    toastState = [...toastState, { id, message, type }];
    notify();
    return id;
  },
  error: (message: string) => toast.show(message, "error"),
  success: (message: string) => toast.show(message, "success"),
  warn: (message: string) => toast.show(message, "warn"),
  dismiss: (id: string) => {
    toastState = toastState.filter((t) => t.id !== id);
    notify();
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const handleToasts = (items: ToastItem[]) => {
      setToasts(items);
    };
    listeners.push(handleToasts);
    return () => {
      listeners = listeners.filter((l) => l !== handleToasts);
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    toasts.forEach((t) => {
      if (!timersRef.current.has(t.id)) {
        const timer = setTimeout(() => {
          timersRef.current.delete(t.id);
          toast.dismiss(t.id);
        }, 4500);
        timersRef.current.set(t.id, timer);
      }
    });

    timersRef.current.forEach((timer, id) => {
      if (!toasts.some((t) => t.id === id)) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    });
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-[calc(100vw-2rem)] w-96 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const isError = t.type === "error";
        const isGood = t.type === "success";

        const borderClass = isError
          ? "border-bad/30"
          : isGood
          ? "border-good/30"
          : "border-warn/30";

        const iconBg = isError
          ? "bg-bad-soft text-bad"
          : isGood
          ? "bg-good-soft text-good"
          : "bg-warn-soft text-warn";

        const Icon = isError
          ? AlertCircle
          : isGood
          ? CheckCircle2
          : AlertTriangle;

        return (
          <div
            key={t.id}
            role={isError ? "alert" : "status"}
            className={`pointer-events-auto bp-fade flex items-start gap-3 rounded-2xl border ${borderClass} bg-card p-3.5 shadow-xl`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
            >
              <Icon size={16} />
            </div>
            <p className="min-w-0 flex-1 pt-1 text-[13px] font-medium leading-snug text-ink">
              {t.message}
            </p>
            <button
              type="button"
              onClick={() => {
                const timer = timersRef.current.get(t.id);
                if (timer) {
                  clearTimeout(timer);
                  timersRef.current.delete(t.id);
                }
                toast.dismiss(t.id);
              }}
              aria-label="Dismiss notification"
              className="shrink-0 cursor-pointer rounded-lg p-1 text-muted transition hover:bg-panel hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

