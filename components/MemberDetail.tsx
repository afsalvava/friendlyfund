"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useTransition } from "react";
import { deleteMember, deleteTransaction } from "@/app/actions";
import { useAddSheet } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  EmptyWalletArt,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import { MemberSheet } from "@/components/MemberSheet";
import { CountUpRupees, Screen } from "@/components/Motion";
import { useToast } from "@/components/Toast";
import { EmptyState, GlassCard, SectionLabel } from "@/components/ui";
import { fullDate, groupByMonth } from "@/lib/grouping";
import { formatRupees } from "@/lib/money";
import type { MemberView, TxView } from "@/lib/queries";

export function MemberDetail({
  member,
  transactions,
}: {
  member: MemberView;
  transactions: TxView[];
}) {
  const router = useRouter();
  const { notify } = useToast();
  const { open, isAdmin } = useAddSheet();

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const months = groupByMonth(transactions);

  function removeMember() {
    startTransition(async () => {
      const result = await deleteMember(member.id);
      if (!result.ok) {
        notify(result.error, "error");
        return;
      }
      notify(`${member.name} removed`);
      router.replace("/members");
    });
  }

  return (
    <Screen>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/members"
          className="glass flex size-10 items-center justify-center rounded-full text-ink active:scale-95"
          aria-label="Back to members"
        >
          <ChevronLeftIcon className="size-5" />
        </Link>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="glass flex size-10 items-center justify-center rounded-full text-ink active:scale-95"
              aria-label="Edit member"
            >
              <PencilIcon className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="glass flex size-10 items-center justify-center rounded-full text-down active:scale-95"
              aria-label="Delete member"
            >
              <TrashIcon className="size-4.5" />
            </button>
          </div>
        )}
      </div>

      {/* Hero ----------------------------------------------------------- */}
      <GlassCard className="relative overflow-hidden px-6 pt-7 pb-6 text-center">
        <div
          aria-hidden="true"
          className="absolute -top-20 left-1/2 size-56 -translate-x-1/2 rounded-full bg-gradient-to-br from-turquoise/30 to-coral/25 blur-3xl"
        />

        <motion.div
          layoutId={`avatar-${member.id}`}
          className="relative mx-auto w-fit"
        >
          <Avatar name={member.name} photoUrl={member.photoUrl} size="xl" />
        </motion.div>

        <h1 className="relative mt-3 text-xl font-extrabold tracking-tight text-ink">
          {member.name}
        </h1>

        <p className="relative mt-3 text-[2.4rem] leading-none font-extrabold tracking-tight text-ink">
          <CountUpRupees value={member.balance} />
        </p>
        <p className="relative mt-1 text-xs font-bold tracking-[0.12em] text-ink-faint uppercase">
          Current balance
        </p>

        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <Stat
            label="Invested"
            value={member.deposits}
            tone="up"
            icon={<ArrowDownLeftIcon className="size-4" />}
          />
          <Stat
            label="Withdrawn"
            value={member.withdrawals}
            tone="down"
            icon={<ArrowUpRightIcon className="size-4" />}
          />
        </div>

        {isAdmin && (
          <motion.button
            type="button"
            onClick={() => open(member.id)}
            whileTap={{ scale: 0.96 }}
            className="relative mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-turquoise to-cobalt py-3.5 text-sm font-bold text-white shadow-[0_12px_26px_-12px_rgba(41,153,104,0.9)]"
          >
            <PlusIcon className="size-4.5" />
            Add entry for {member.name.split(" ")[0]}
          </motion.button>
        )}
      </GlassCard>

      {/* History -------------------------------------------------------- */}
      <section className="mt-7">
        <SectionLabel>History</SectionLabel>

        {transactions.length === 0 ? (
          <GlassCard>
            <EmptyState
              art={<EmptyWalletArt className="w-44" />}
              title="No entries yet"
              body={`Once you record a deposit for ${member.name.split(" ")[0]}, every date and amount shows up here.`}
            />
          </GlassCard>
        ) : (
          <div className="space-y-5">
            {months.map((month) => (
              <div key={month.key}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h3 className="text-xs font-extrabold tracking-[0.12em] text-ink-soft uppercase">
                    {month.label}
                  </h3>
                  <span className="text-xs font-bold tabular text-ink-faint">
                    {formatRupees(
                      month.items.reduce(
                        (sum, t) =>
                          sum + (t.type === "DEPOSIT" ? t.amount : -t.amount),
                        0,
                      ),
                      { sign: true },
                    )}
                  </span>
                </div>

                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {month.items.map((tx) => (
                      <HistoryRow key={tx.id} tx={tx} canEdit={isAdmin} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isAdmin && (
        <>
          <MemberSheet
            open={editing}
            onClose={() => setEditing(false)}
            member={{
              id: member.id,
              name: member.name,
              photoUrl: member.photoUrl,
            }}
          />

          <ConfirmDialog
            open={confirmingDelete}
            title={`Remove ${member.name}?`}
            body={`This also deletes their ${member.transactionCount} ${
              member.transactionCount === 1 ? "entry" : "entries"
            }. It cannot be undone.`}
            confirmLabel={pending ? "Removing…" : "Remove"}
            onCancel={() => setConfirmingDelete(false)}
            onConfirm={removeMember}
          />
        </>
      )}
    </Screen>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "up" | "down";
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/55 px-3 py-3 text-left ring-1 ring-white/70">
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase ${
          tone === "up" ? "text-up" : "text-down"
        }`}
      >
        {icon}
        {label}
      </span>
      <p className="mt-1 text-lg font-extrabold tabular text-ink">
        {formatRupees(value)}
      </p>
    </div>
  );
}

function HistoryRow({ tx, canEdit }: { tx: TxView; canEdit: boolean }) {
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const isDeposit = tx.type === "DEPOSIT";

  function remove() {
    startTransition(async () => {
      const result = await deleteTransaction(tx.id);
      if (!result.ok) {
        notify(result.error, "error");
        return;
      }
      notify("Entry deleted");
      setConfirming(false);
    });
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: pending ? 0.5 : 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      >
        <GlassCard>
          <div className="flex items-center gap-3 px-3.5 py-3">
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-full ${
                isDeposit ? "bg-up/12 text-up" : "bg-down/12 text-down"
              }`}
            >
              {isDeposit ? (
                <ArrowDownLeftIcon className="size-5" />
              ) : (
                <ArrowUpRightIcon className="size-5" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-ink">
                {fullDate(tx.date)}
              </p>
              <p className="truncate text-xs font-medium text-ink-faint">
                {tx.note ?? (isDeposit ? "Deposit" : "Withdrawal")}
              </p>
            </div>

            <p
              className={`shrink-0 text-[15px] font-extrabold tabular ${
                isDeposit ? "text-up" : "text-down"
              }`}
            >
              {isDeposit
                ? formatRupees(tx.amount, { sign: true })
                : formatRupees(-tx.amount)}
            </p>

            {canEdit && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label="Delete this entry"
                className="shrink-0 rounded-full p-1.5 text-ink-faint active:scale-90"
              >
                <TrashIcon className="size-4" />
              </button>
            )}
          </div>
        </GlassCard>
      </motion.div>

      <ConfirmDialog
        open={confirming}
        title="Delete this entry?"
        body={`${isDeposit ? "Deposit" : "Withdrawal"} of ${formatRupees(
          tx.amount,
        )} on ${fullDate(tx.date)}.`}
        confirmLabel={pending ? "Deleting…" : "Delete"}
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
      />
    </>
  );
}

function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center px-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]"
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="relative w-full max-w-[20rem] rounded-[26px] border border-white/70 bg-white/90 p-5 text-center shadow-[0_20px_50px_-16px_rgba(18,60,53,0.5)] backdrop-blur-2xl"
          >
            <p className="text-base font-extrabold text-ink">{title}</p>
            <p className="mt-1.5 text-sm font-medium text-ink-soft">{body}</p>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-2xl bg-ink/8 py-3 text-sm font-bold text-ink-soft active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-2xl bg-down py-3 text-sm font-bold text-white shadow-[0_10px_22px_-10px_rgba(184,53,79,0.9)] active:scale-95"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
