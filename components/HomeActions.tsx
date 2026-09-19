"use client";

import { motion } from "framer-motion";
import { PlusIcon } from "@/components/Icons";
import { useAddSheet } from "@/components/AppShell";

/** Empty-state shortcut that opens the same sheet as the "+" button in the nav bar. */
export function AddFirstEntryButton({
  label = "Add Deposit",
}: {
  label?: string;
}) {
  const { open, isAdmin } = useAddSheet();
  if (!isAdmin) return null;

  return (
    <motion.button
      type="button"
      onClick={() => open()}
      whileTap={{ scale: 0.95 }}
      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-turquoise to-cobalt px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(41,153,104,0.9)]"
    >
      <PlusIcon className="size-4" />
      {label}
    </motion.button>
  );
}

/** Opens the new-member sheet. */
export function AddMemberButton({
  label = "Add a member",
  variant = "solid",
}: {
  label?: string;
  variant?: "solid" | "pill";
}) {
  const { openMemberForm, isAdmin } = useAddSheet();
  if (!isAdmin) return null;

  if (variant === "pill") {
    return (
      <motion.button
        type="button"
        onClick={openMemberForm}
        whileTap={{ scale: 0.94 }}
        className="shrink-0 rounded-full bg-white/70 px-4 py-2.5 text-xs font-bold text-ink ring-1 ring-white/80"
      >
        + New
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={openMemberForm}
      whileTap={{ scale: 0.95 }}
      className="rounded-full bg-gradient-to-br from-turquoise to-cobalt px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(41,153,104,0.9)]"
    >
      {label}
    </motion.button>
  );
}
