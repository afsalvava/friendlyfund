"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Toast = { id: number; message: string; tone: "ok" | "error" };

const ToastContext = createContext<{
  notify: (message: string, tone?: Toast["tone"]) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const notify = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(
      () => setToasts((current) => current.filter((t) => t.id !== id)),
      2800
    );
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={`flex max-w-[22rem] items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-[0_12px_30px_-12px_rgba(18,60,53,0.5)] backdrop-blur-xl ${
                toast.tone === "error"
                  ? "border-down/25 bg-white/85 text-down"
                  : "border-up/25 bg-white/85 text-up"
              }`}
            >
              <span
                className={`size-1.5 shrink-0 rounded-full ${
                  toast.tone === "error" ? "bg-down" : "bg-up"
                }`}
              />
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
