"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { AddMemberButton } from "@/components/HomeActions";
import { ChevronRightIcon, EmptyPeopleArt, SearchIcon } from "@/components/Icons";
import { Screen } from "@/components/Motion";
import { EmptyState, GlassCard, ScreenTitle } from "@/components/ui";
import { groupByLetter } from "@/lib/grouping";
import { formatRupees } from "@/lib/money";
import type { MemberView } from "@/lib/queries";

export function MembersList({ members }: { members: MemberView[] }) {
  const [query, setQuery] = useState("");
  const [showOthers, setShowOthers] = useState(false);

  // Only people with entries belong in the list. The rest are kept one tap
  // away, so adding a member never looks like it silently failed.
  const { saving, others } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? members.filter((m) => m.name.toLowerCase().includes(needle))
      : members;

    return {
      saving: matching.filter((m) => m.transactionCount > 0),
      others: matching.filter((m) => m.transactionCount === 0),
    };
  }, [members, query]);

  const groups = useMemo(() => groupByLetter(saving), [saving]);

  const total = saving.reduce((sum, m) => sum + m.balance, 0);

  return (
    <Screen>
      <ScreenTitle
        title="Members"
        subtitle={
          saving.length ? `${saving.length} saving ${formatRupees(total)}` : undefined
        }
        action={members.length > 0 ? <AddMemberButton variant="pill" /> : undefined}
      />

      {members.length === 0 ? (
        <GlassCard>
          <EmptyState
            art={<EmptyPeopleArt className="w-48" />}
            title="No members yet"
            body="Members and their balances will show up here."
            action={<AddMemberButton />}
          />
        </GlassCard>
      ) : (
        <>
          <label className="glass mb-5 flex items-center gap-2.5 rounded-2xl px-4 py-3">
            <SearchIcon className="size-4.5 shrink-0 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members"
              className="w-full bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-faint/80"
            />
          </label>

          {groups.length === 0 && others.length === 0 ? (
            <p className="py-10 text-center text-sm font-semibold text-ink-faint">
              No one matches “{query.trim()}”.
            </p>
          ) : groups.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-ink-faint">
              No one has anything saved yet.
            </p>
          ) : (
            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {groups.map((group) => (
                  <motion.section
                    key={group.letter}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  >
                    <h2 className="sticky top-0 z-10 -mx-1 mb-2 w-fit rounded-full bg-white/70 px-3 py-1 text-xs font-extrabold tracking-[0.12em] text-ink-soft uppercase backdrop-blur-md">
                      {group.letter}
                    </h2>

                    <div className="space-y-2">
                      {group.items.map((member, index) => (
                        <MemberRow key={member.id} member={member} index={index} />
                      ))}
                    </div>
                  </motion.section>
                ))}
              </AnimatePresence>
            </div>
          )}

          {others.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowOthers((v) => !v)}
                aria-expanded={showOthers}
                className="mx-auto block text-center text-[11px] font-bold text-ink-faint underline decoration-ink-faint/40 underline-offset-4"
              >
                {others.length === 1
                  ? `1 other has nothing saved yet`
                  : `${others.length} others have nothing saved yet`}
              </button>

              <AnimatePresence initial={false}>
                {showOthers && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 36 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2 opacity-70">
                      {others.map((member, index) => (
                        <MemberRow key={member.id} member={member} index={index} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </Screen>
  );
}

function MemberRow({ member, index }: { member: MemberView; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 32,
        delay: Math.min(index * 0.04, 0.24),
      }}
      whileTap={{ scale: 0.98 }}
    >
      <GlassCard>
        <Link
          href={`/members/${member.id}`}
          className="flex items-center gap-3 px-3.5 py-3"
        >
          <Avatar name={member.name} photoUrl={member.photoUrl} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-ink">{member.name}</p>
            <p className="truncate text-xs font-medium text-ink-faint">
              {member.transactionCount === 0
                ? "No entries yet"
                : `${member.transactionCount} ${
                    member.transactionCount === 1 ? "entry" : "entries"
                  }`}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase ${
              member.paidThisMonth ? "bg-up/12 text-up" : "bg-down/12 text-down"
            }`}
          >
            {member.paidThisMonth ? "Paid" : "Unpaid"}
          </span>

          <div className="text-right">
            <p
              className={`text-[15px] font-extrabold tabular ${
                member.balance < 0 ? "text-down" : "text-ink"
              }`}
            >
              {formatRupees(member.balance)}
            </p>
            <p className="text-[10px] font-bold tracking-wide text-ink-faint uppercase">
              Balance
            </p>
          </div>

          <ChevronRightIcon className="size-4 shrink-0 text-ink-faint" />
        </Link>
      </GlassCard>
    </motion.div>
  );
}
