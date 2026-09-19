import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { ArrowDownLeftIcon, ArrowUpRightIcon } from "@/components/Icons";
import { relativeDate } from "@/lib/grouping";
import { formatRupees } from "@/lib/money";
import type { TxView } from "@/lib/queries";

export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`glass glass-sheen rounded-[var(--radius-glass)] ${className}`}
    >
      {children}
    </div>
  );
}

export function ScreenTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm font-medium text-ink-soft">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2.5 px-1 text-xs font-bold tracking-[0.12em] text-ink-faint uppercase">
      {children}
    </h2>
  );
}

/** One line of money movement. Used on Home and on a member's history. */
export function TransactionRow({
  tx,
  showMember = true,
  href,
}: {
  tx: TxView;
  showMember?: boolean;
  href?: string;
}) {
  const isDeposit = tx.type === "DEPOSIT";

  const body = (
    <div className="flex items-center gap-3 px-3.5 py-3">
      {showMember ? (
        <Avatar name={tx.memberName} photoUrl={tx.memberPhotoUrl} />
      ) : (
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
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-ink">
          {showMember ? tx.memberName : isDeposit ? "Deposit" : "Withdrawal"}
        </p>
        <p className="truncate text-xs font-medium text-ink-faint">
          {tx.note ? `${relativeDate(tx.date)} · ${tx.note}` : relativeDate(tx.date)}
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
    </div>
  );

  return href ? (
    <Link href={href} className="block active:opacity-70">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EmptyState({
  art,
  title,
  body,
  action,
}: {
  art: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
      {art}
      <div>
        <p className="text-base font-bold text-ink">{title}</p>
        <p className="mx-auto mt-1 max-w-[16rem] text-sm font-medium text-ink-soft">
          {body}
        </p>
      </div>
      {action}
    </div>
  );
}
