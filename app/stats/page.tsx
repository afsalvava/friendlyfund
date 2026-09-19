import { AddFirstEntryButton } from "@/components/HomeActions";
import { EmptyChartArt } from "@/components/Icons";
import { Screen } from "@/components/Motion";
import { PoolChart, SaverBars } from "@/components/PoolChart";
import { EmptyState, GlassCard, ScreenTitle, SectionLabel } from "@/components/ui";
import { monthLabel } from "@/lib/grouping";
import { formatRupees } from "@/lib/money";
import { getHomeSummary, getMembers, getMonthlySeries } from "@/lib/queries";

export default async function StatsPage() {
  const [summary, members, series] = await Promise.all([
    getHomeSummary(),
    getMembers(),
    getMonthlySeries(6),
  ]);

  const hasData = members.some((m) => m.transactionCount > 0);

  const ranked = [...members]
    .sort((a, b) => b.balance - a.balance)
    .filter((m) => m.transactionCount > 0);

  const bestMonth = [...series].sort((a, b) => b.net - a.net)[0];

  return (
    <Screen>
      <ScreenTitle
        title="Stats"
        subtitle={hasData ? "How the fund has grown" : undefined}
      />

      {!hasData ? (
        <GlassCard>
          <EmptyState
            art={<EmptyChartArt className="w-48" />}
            title="Nothing to chart yet"
            body="Record a few deposits and the growth chart and rankings appear here."
            action={<AddFirstEntryButton />}
          />
        </GlassCard>
      ) : (
        <div className="space-y-7">
          <section>
            <SectionLabel>Total Amount Collected · last 6 months</SectionLabel>
            <GlassCard className="p-4 pb-2">
              <PoolChart points={series} />
            </GlassCard>
          </section>

          <section>
            <SectionLabel>Month by month</SectionLabel>
            <GlassCard className="divide-y divide-ink/5">
              {[...series].reverse().map((point) => (
                <div
                  key={point.key}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-[13px] font-bold text-ink">
                    {monthLabel(point.date)}
                  </span>
                  <div className="text-right">
                    <p
                      className={`text-[13px] font-extrabold tabular ${
                        point.net > 0
                          ? "text-up"
                          : point.net < 0
                            ? "text-down"
                            : "text-ink-faint"
                      }`}
                    >
                      {point.net === 0
                        ? "—"
                        : formatRupees(point.net, { sign: point.net > 0 })}
                    </p>
                    <p className="text-[10px] font-bold tabular text-ink-faint">
                      total {formatRupees(point.cumulative)}
                    </p>
                  </div>
                </div>
              ))}
            </GlassCard>
          </section>

          <section>
            <SectionLabel>Top savers</SectionLabel>
            <GlassCard className="px-4 py-5">
              <SaverBars
                rows={ranked.map((m) => ({
                  id: m.id,
                  name: m.name,
                  balance: m.balance,
                }))}
              />
            </GlassCard>
          </section>

          <section>
            <SectionLabel>At a glance</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <Tile
                label="Total Amount Collected"
                value={formatRupees(summary.totalPool)}
              />
              <Tile
                label="Members"
                value={String(summary.memberCount)}
                plain
              />
              <Tile
                label="Average balance"
                value={formatRupees(
                  ranked.length ? summary.totalPool / ranked.length : 0
                )}
              />
              <Tile
                label="Best month"
                value={bestMonth && bestMonth.net > 0 ? formatRupees(bestMonth.net) : "—"}
                caption={
                  bestMonth && bestMonth.net > 0 ? monthLabel(bestMonth.date) : undefined
                }
              />
            </div>
          </section>
        </div>
      )}
    </Screen>
  );
}

function Tile({
  label,
  value,
  caption,
  plain = false,
}: {
  label: string;
  value: string;
  caption?: string;
  plain?: boolean;
}) {
  return (
    <GlassCard className="px-4 py-4">
      <p className="text-[10px] font-bold tracking-[0.12em] text-ink-faint uppercase">
        {label}
      </p>
      <p
        className={`mt-1 font-extrabold tracking-tight text-ink ${
          plain ? "text-2xl" : "text-xl tabular"
        }`}
      >
        {value}
      </p>
      {caption && (
        <p className="mt-0.5 text-[11px] font-semibold text-ink-faint">{caption}</p>
      )}
    </GlassCard>
  );
}
