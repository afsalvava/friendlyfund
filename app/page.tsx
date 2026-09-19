import { CountUpRupees, Screen, Stagger, StaggerItem } from "@/components/Motion";
import {
  EmptyWalletArt,
  MembersIcon,
  ReceiptCheckIcon,
  SproutIcon,
  TrendUpIcon,
  WalletIcon,
} from "@/components/Icons";
import { AddFirstEntryButton } from "@/components/HomeActions";
import { ProfileButton } from "@/components/ProfileButton";
import { EmptyState, GlassCard, SectionLabel, TransactionRow } from "@/components/ui";
import { isAdmin as checkIsAdmin } from "@/lib/auth";
import { getHomeSummary, getRecentTransactions } from "@/lib/queries";
import { formatRupees, percentChange } from "@/lib/money";

export default async function HomePage() {
  const [summary, recent, admin] = await Promise.all([
    getHomeSummary(),
    getRecentTransactions(15),
    checkIsAdmin(),
  ]);

  const change = percentChange(
    summary.totalPool,
    summary.totalPool - summary.thisMonthNet
  );

  return (
    <Screen>
      <header className="mb-4 flex items-start gap-3">
        <div className="flex-1 text-center">
          <h1 className="font-wordmark text-[2.1rem] leading-none font-extrabold tracking-tight">
            <span className="text-ink">Friendly</span>
            <span className="text-turquoise">Fund</span>
          </h1>
          <p className="mt-1.5 text-sm font-medium text-ink-soft">
            Saving together, one deposit at a time.
          </p>
        </div>
        <ProfileButton isAdmin={admin} />
      </header>

      {/* Total amount collected ------------------------------------------ */}
      <div className="relative overflow-hidden rounded-[var(--radius-glass)] bg-gradient-to-br from-cyan to-cobalt p-6 text-white shadow-[0_14px_32px_-14px_rgba(18,60,53,0.55)]">
        <SproutIcon className="absolute top-6 right-6 size-10 text-white/30" />
        <p className="absolute top-[4.7rem] right-6 w-24 text-right text-[11px] leading-snug font-medium text-white/75">
          Small contributions create big tomorrows.
        </p>

        <div className="relative flex items-center gap-2 text-white/85">
          <WalletIcon className="size-4" />
          <span className="text-xs font-bold tracking-[0.12em] uppercase">
            Total Amount Collected
          </span>
        </div>

        <p className="relative mt-2 text-[2.6rem] leading-none font-extrabold tracking-tight">
          <CountUpRupees value={summary.totalPool} />
        </p>

        <div className="relative mt-4 space-y-1.5">
          <div className="no-scrollbar flex flex-nowrap items-center gap-1.5 overflow-x-auto">
            <Chip
              label={`${formatRupees(summary.thisMonthNet, {
                sign: summary.thisMonthNet > 0,
              })} this month`}
              icon={<TrendUpIcon className="size-3.5" />}
            />
            {change !== null && Math.abs(change) >= 0.1 && (
              <Chip label={`${change > 0 ? "+" : "−"}${Math.abs(change).toFixed(1)}%`} />
            )}
          </div>
          <div className="no-scrollbar flex flex-nowrap items-center gap-1.5 overflow-x-auto">
            <Chip
              label={`${summary.memberCount} ${
                summary.memberCount === 1 ? "member" : "members"
              }`}
              icon={<MembersIcon className="size-3.5" />}
            />
            <Chip
              label={`${summary.paidCount}/${summary.memberCount} paid this month`}
              icon={<ReceiptCheckIcon className="size-3.5" />}
            />
          </div>
        </div>
      </div>

      {/* Recent activity ------------------------------------------------ */}
      <section className="mt-8">
        <SectionLabel>Recent transactions</SectionLabel>

        {recent.length === 0 ? (
          <GlassCard>
            <EmptyState
              art={<EmptyWalletArt className="w-48" />}
              title="Nothing recorded yet"
              body="Tap the + button to log the first deposit and this list will fill up."
              action={<AddFirstEntryButton />}
            />
          </GlassCard>
        ) : (
          <Stagger className="space-y-2">
            {recent.map((tx) => (
              <StaggerItem key={tx.id}>
                <GlassCard>
                  <TransactionRow tx={tx} href={`/members/${tx.memberId}`} />
                </GlassCard>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </Screen>
  );
}

function Chip({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-bold whitespace-nowrap text-ink">
      {icon && <span className="text-turquoise">{icon}</span>}
      {label}
    </span>
  );
}
