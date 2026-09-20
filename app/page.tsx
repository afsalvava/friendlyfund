import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { CountUpRupees, Screen } from "@/components/Motion";
import { BellIcon, ChevronRightIcon, SproutIcon, WalletIcon } from "@/components/Icons";
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
          <div className="hero-brand">
            <h1 className="hero-title">Chanks Money Pool</h1>
            <p className="hero-tagline">Friends save better together.</p>
          </div>
          <div className="hero-friends">
            <Image
              src="/chanks-friends.png"
              alt="Three friends smiling together"
              width={1685}
              height={933}
              priority
              className="hero-friends-img"
            />
          </div>
          <Link href="/admin" className="hero-bell" aria-label="Open notifications and account">
            <BellIcon className="size-5" />
            <span className="hero-bell-dot" aria-hidden="true" />
          </Link>
        </section>

        <section className="pool-card">
          <div className="pool-amount">
            <div className="pool-label"><WalletIcon className="size-5" /><span>Total amount collected</span></div>
            <p className="pool-total"><CountUpRupees value={summary.totalPool} /></p>
          </div>
          <div className="pool-message">
            <SproutIcon className="pool-message-icon" />
            <p className="pool-message-text">Small<br />Contributions<br />Big Friendships</p>
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
