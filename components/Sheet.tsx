"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

/**
 * A bottom sheet that springs up, dims the screen behind it, and can be
 * flicked or dragged down to dismiss — the way a native sheet behaves.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  // Escape closes, and the page behind must not scroll while it is up.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) onClose();
            }}
            className="relative flex max-h-[92dvh] w-[min(100%,30rem)] flex-col rounded-t-[30px] border border-white/70 bg-white/85 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-16px_50px_-14px_rgba(18,60,53,0.4)] backdrop-blur-2xl backdrop-saturate-150"
          >
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <span className="h-1.5 w-11 rounded-full bg-ink/15" />
            </div>

            {title && (
              <h2 className="shrink-0 px-6 pb-1 text-center text-base font-bold text-ink">
                {title}
              </h2>
            )}

            <div className="no-scrollbar overflow-y-auto overscroll-contain px-5 pt-2">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
