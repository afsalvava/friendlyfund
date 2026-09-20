"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { HomeIcon, MembersIcon, PlusIcon, StatsIcon } from "@/components/Icons";
import { useAddSheet } from "@/components/AppShell";

const PRIMARY_TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/members", label: "Members", Icon: MembersIcon },
] as const;

const SECONDARY_TABS = [
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
        className={`bottom-nav-shell pointer-events-auto mb-4 flex items-center justify-around ${
          isAdmin
            ? "w-[min(calc(100%-2rem),25rem)]"
            : "w-[min(calc(100%-4rem),20rem)]"
        }`}
      >
        {PRIMARY_TABS.map((tab) => (
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
              className="nav-add flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[#20ca75] to-[#008d50] text-white"
            >
              <PlusIcon className="size-7" />
            </motion.span>
          </button>
        )}

        {SECONDARY_TABS.map((tab) => (
          <Tab key={tab.href} {...tab} active={isActive(tab.href)} />
        ))}
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
        style={active ? { color: "#00583d" } : undefined}
        className="relative flex min-w-[3.75rem] flex-col items-center gap-0.5 rounded-[16px] px-2.5 py-1.5 text-ink-faint transition-colors"
      >
        {active && (
          <motion.span
            layoutId="tab-pill"
            transition={{ type: "spring", stiffness: 480, damping: 36 }}
            className="absolute inset-0 -z-10 rounded-[16px] bg-[#dff8e8]"
          />
        )}
        <Icon filled={active} className="size-6" />
        <span className="text-[10px] font-bold tracking-wide">{label}</span>
      </motion.span>
    </Link>
  );
}
