import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { CountUpRupees, Screen } from "@/components/Motion";
import { ChevronRightIcon, HeartIcon, MembersIcon, ReceiptCheckIcon, SproutIcon, TrendUpIcon, WalletIcon } from "@/components/Icons";
import { AddFirstEntryButton } from "@/components/HomeActions";
import { EmptyState } from "@/components/ui";
import { relativeDate } from "@/lib/grouping";
import { formatRupees } from "@/lib/money";
import { getHomeSummary, getRecentTransactions } from "@/lib/queries";

export default async function HomePage() {
  const [summary, recent] = await Promise.all([
    getHomeSummary(),
    getRecentTransactions(4),
  ]);

  return (
    <Screen>
      <div className="home-screen">
        <section className="home-hero">
          <Image
            src="/home-screen-reference.png"
            alt="Chanks Money Pool — friends save better together"
            width={843}
            height={1866}
            priority
            className="home-hero-reference"
          />
          <Link href="/admin" className="home-banner-hotspot" aria-label="Open notifications and account" />
        </section>

        <section className="pool-card">
          <div className="pool-orb pool-orb-one" /><div className="pool-orb pool-orb-two" /><div className="pool-leaf" />
          <div className="pool-label"><WalletIcon className="size-5" /><span>Total amount collected</span></div>
          <p className="pool-total"><CountUpRupees value={summary.totalPool} /></p>
          <div className="pool-month-chip"><TrendUpIcon className="size-5" /><span>{formatRupees(summary.thisMonthNet, { sign: summary.thisMonthNet > 0 })} this month</span></div>
          <div className="pool-message">
            <p className="pool-message-text">Small<br />Contributions<br />Big Friendships</p>
            <svg className="pool-message-squiggle" viewBox="0 0 100 14" preserveAspectRatio="none" fill="none" aria-hidden="true">
              <path d="M2 9 C 16 1, 30 15, 45 7 S 72 -1, 86 8 S 96 12, 98 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <HeartIcon className="pool-message-heart" />
          </div>
          <div className="pool-stats">
            <div><MembersIcon className="size-5" /><span>{summary.memberCount} {summary.memberCount === 1 ? "member" : "members"}</span></div>
            <div><ReceiptCheckIcon className="size-5" /><span>{summary.paidCount}/{summary.memberCount} paid this month</span></div>
          </div>
        </section>

        <section className="home-activity">
          <div className="activity-heading"><h2>Recent transactions</h2><Link href="/members">View all <ChevronRightIcon className="size-4" /></Link></div>
          {recent.length === 0 ? (
            <div className="home-empty"><EmptyState art={<SproutIcon className="w-20 text-turquoise" />} title="Nothing recorded yet" body="Add the first deposit and your group activity will appear here." action={<AddFirstEntryButton />} /></div>
          ) : (
            <div className="transaction-stack">
              {recent.map((tx) => {
                const isDeposit = tx.type === "DEPOSIT";
                return (
                  <Link href={`/members/${tx.memberId}`} className="home-transaction" key={tx.id}>
                    <Avatar name={tx.memberName} photoUrl={tx.memberPhotoUrl} />
                    <div className="transaction-person"><strong>{tx.memberName}</strong><span>{relativeDate(tx.date)}</span></div>
                    <div className="transaction-value"><strong className={isDeposit ? "is-up" : "is-down"}>{isDeposit ? formatRupees(tx.amount, { sign: true }) : formatRupees(-tx.amount)}</strong><span>{tx.note || (isDeposit ? "Monthly contribution" : "Withdrawal")}</span></div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <Link href="/stats" className="growth-card">
          <span className="growth-icon"><SproutIcon className="size-11" /></span>
          <span className="growth-copy"><strong>Small contributions<br />create big tomorrows.</strong><small>Stay consistent. Grow together.</small></span>
          <ChevronRightIcon className="size-6" />
        </Link>
      </div>
    </Screen>
  );
}
