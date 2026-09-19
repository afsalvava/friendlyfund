"use client";

import { motion } from "framer-motion";
import { useState, useTransition } from "react";
import { createTransaction } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { EmptyPeopleArt, SearchIcon } from "@/components/Icons";
import { Sheet } from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import type { PickerMember } from "@/components/AppShell";
import { formatRupees, parseAmount } from "@/lib/money";

/** The fixed monthly contribution — the amount defaults to it on every deposit. */
const MONTHLY_AMOUNT = 1000;

/** Today as "YYYY-MM-DD" in the user's own timezone. */
function todayInput(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

type EntrySheetProps = {
  open: boolean;
  onClose: () => void;
  members: PickerMember[];
  preselectedId?: string;
  onAddMember: () => void;
};

export function EntrySheet(props: EntrySheetProps) {
  // Remounting the body on each open gives a clean form without reset effects.
  const generation = props.open ? `${props.preselectedId ?? "none"}` : "closed";

  return (
    <Sheet open={props.open} onClose={props.onClose} title="New entry">
      <EntryForm key={generation} {...props} />
    </Sheet>
  );
}

function EntryForm({
  onClose,
  members,
  preselectedId,
  onAddMember,
}: EntrySheetProps) {
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();

  const [memberId, setMemberId] = useState(
    preselectedId ?? (members.length === 1 ? members[0].id : ""),
  );
  const [type, setType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  // Deposits default to the monthly amount — the common case needs no typing.
  const [amount, setAmount] = useState(String(MONTHLY_AMOUNT));
  const [date, setDate] = useState(todayInput);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(memberQuery.trim().toLowerCase()),
  );

  const parsed = parseAmount(amount);
  const canSubmit = Boolean(memberId) && parsed !== null && !pending;

  function submit() {
    if (!memberId) return setError("Pick a member first.");
    if (parsed === null) return setError("Enter an amount greater than zero.");

    const data = new FormData();
    data.set("memberId", memberId);
    data.set("type", type);
    data.set("amount", String(parsed));
    data.set("date", date);
    data.set("note", note);

    startTransition(async () => {
      const result = await createTransaction(data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const who = members.find((m) => m.id === memberId)?.name ?? "Member";
      notify(
        `${type === "DEPOSIT" ? "Added" : "Withdrew"} ${formatRupees(parsed)} · ${who}`,
      );
      onClose();
    });
  }

  return (
    <>
      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-4 pt-2 pb-8 text-center">
          <EmptyPeopleArt className="w-44" />
          <div>
            <p className="font-bold text-ink">No members yet</p>
            <p className="mt-1 text-sm text-ink-soft">
              Add someone first, then you can record their savings.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddMember}
            className="rounded-full bg-gradient-to-br from-turquoise to-cobalt px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(41,153,104,0.9)]"
          >
            Add a member
          </button>
        </div>
      ) : (
        <div className="space-y-5 pb-6">
          {/* Deposit / withdrawal ---------------------------------------- */}
          <div className="relative grid grid-cols-2 gap-1 rounded-2xl bg-ink/5 p-1">
            {(["DEPOSIT", "WITHDRAWAL"] as const).map((option) => {
              const active = type === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className="relative rounded-xl py-2.5 text-sm font-bold"
                >
                  {active && (
                    <motion.span
                      layoutId="type-pill"
                      transition={{
                        type: "spring",
                        stiffness: 460,
                        damping: 34,
                      }}
                      className={`absolute inset-0 rounded-xl shadow-sm ${
                        option === "DEPOSIT" ? "bg-up" : "bg-down"
                      }`}
                    />
                  )}
                  <span
                    className={`relative ${active ? "text-white" : "text-ink-soft"}`}
                  >
                    {option === "DEPOSIT" ? "Deposit" : "Withdraw"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Amount ------------------------------------------------------ */}
          <div>
            <div className="flex items-end justify-center gap-0.5 rounded-3xl bg-white/60 px-4 py-5 ring-1 ring-white/70">
              <span className="pb-1 text-3xl font-bold text-ink-faint">₹</span>
              <input
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                inputMode="decimal"
                placeholder="0"
                aria-label="Amount in rupees"
                size={1}
                // Grows with the digits so the ₹ always hugs the number.
                className="w-auto max-w-[8ch] min-w-[1.5ch] bg-transparent text-left text-[2.75rem] leading-none font-extrabold tabular text-ink outline-none field-sizing-content placeholder:text-ink-faint/50"
              />
            </div>
          </div>

          {/* Member ------------------------------------------------------ */}
          <div>
            <p className="mb-2 text-xs font-bold tracking-wide text-ink-faint uppercase">
              Member
            </p>

            <label className="mb-2.5 flex items-center gap-2 rounded-2xl bg-white/70 px-3.5 py-2.5 ring-1 ring-white/80">
              <SearchIcon className="size-4 shrink-0 text-ink-faint" />
              <input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search members"
                className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-faint/70"
              />
            </label>

            {memberQuery.trim() && filteredMembers.length === 0 && (
              <p className="mb-2 text-sm font-semibold text-ink-faint">
                No one matches “{memberQuery.trim()}”.
              </p>
            )}

            <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pt-1.5 pb-1.5">
              {filteredMembers.map((member) => {
                const active = member.id === memberId;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setMemberId(member.id);
                      setError(null);
                    }}
                    className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                  >
                    <motion.span
                      animate={{ scale: active ? 1.06 : 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 520,
                        damping: 26,
                      }}
                      className={`rounded-full ${
                        active
                          ? "ring-2 ring-turquoise ring-offset-2 ring-offset-white/60"
                          : ""
                      }`}
                    >
                      <Avatar name={member.name} photoUrl={member.photoUrl} />
                    </motion.span>
                    <span
                      className={`w-full truncate text-center text-[11px] font-semibold ${
                        active ? "text-ink" : "text-ink-faint"
                      }`}
                    >
                      {member.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={onAddMember}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5"
              >
                <span className="grid size-12 place-items-center rounded-full border-2 border-dashed border-ink/20 text-xl text-ink-faint">
                  +
                </span>
                <span className="text-[11px] font-semibold text-ink-faint">
                  New
                </span>
              </button>
            </div>
          </div>

          {/* Date and note ---------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={todayInput()}
                className="rounded-2xl bg-white/70 px-3.5 py-3 text-sm font-semibold text-ink ring-1 ring-white/80 outline-none focus:ring-turquoise"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                Note
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
                maxLength={140}
                className="rounded-2xl bg-white/70 px-3.5 py-3 text-sm font-semibold text-ink ring-1 ring-white/80 outline-none placeholder:font-medium placeholder:text-ink-faint/70 focus:ring-turquoise"
              />
            </label>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-sm font-semibold text-down"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            whileTap={canSubmit ? { scale: 0.97 } : undefined}
            className={`w-full rounded-2xl py-4 text-base font-bold text-white transition-opacity ${
              type === "DEPOSIT"
                ? "bg-gradient-to-br from-up to-cyan"
                : "bg-gradient-to-br from-down to-coral"
            } ${canSubmit ? "shadow-[0_14px_30px_-12px_rgba(18,60,53,0.7)]" : "opacity-45"}`}
          >
            {pending
              ? "Saving…"
              : `${type === "DEPOSIT" ? "Add" : "Withdraw"} ${
                  parsed !== null ? formatRupees(parsed) : ""
                }`.trim()}
          </motion.button>
        </div>
      )}
    </>
  );
}
