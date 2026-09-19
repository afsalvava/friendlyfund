"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { HomeIcon, MembersIcon, PlusIcon, StatsIcon } from "@/components/Icons";
import { useAddSheet } from "@/components/AppShell";

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/members", label: "Members", Icon: MembersIcon },
  { href: "/stats", label: "Stats", Icon: StatsIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { open, isAdmin } = useAddSheet();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center safe-bottom">
      <div
        className={`pointer-events-auto mb-4 flex items-center justify-around rounded-[22px] border border-white/70 bg-[var(--nav-bg)] px-1.5 py-1 shadow-[0_16px_40px_-14px_rgba(18,60,53,0.35)] backdrop-blur-xl ${
          isAdmin ? "w-[min(100%-3rem,23rem)]" : "w-[min(100%-5rem,19rem)]"
        }`}
      >
        {TABS.map((tab) => (
          <Tab key={tab.href} {...tab} active={isActive(tab.href)} />
        ))}

        {isAdmin && (
          <button
            type="button"
            onClick={() => open()}
            aria-label="Add a deposit"
            className="flex flex-1 justify-center"
          >
            <motion.span
              whileTap={{ scale: 0.92 }}
              className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-turquoise to-cobalt text-white shadow-[0_6px_16px_-6px_rgba(18,60,53,0.5)]"
            >
              <PlusIcon className="size-5" />
            </motion.span>
          </button>
        )}
      </div>
    </nav>
  );
}

function Tab({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof HomeIcon;
  active: boolean;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className="flex flex-1 justify-center">
      <motion.span
        animate={active ? { scale: 1.02 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 28 }}
        className={`relative flex flex-col items-center gap-0.5 rounded-[16px] px-3 py-1.5 text-ink-faint transition-colors ${
          active ? "text-cobalt" : ""
        }`}
      >
        {active && (
          <motion.span
            layoutId="tab-pill"
            transition={{ type: "spring", stiffness: 480, damping: 36 }}
            className="absolute inset-0 -z-10 rounded-[16px] bg-turquoise/22"
          />
        )}
        <Icon filled={active} className="size-5" />
        <span className="text-[11px] font-bold tracking-wide">{label}</span>
      </motion.span>
    </Link>
  );
}
