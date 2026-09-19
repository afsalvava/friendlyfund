# Multi-Fund (Trip / Emergency) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the ledger into two funds — Trip Fund and Emergency Fund — with a small toggle on the home screen that scopes the whole app to one fund at a time.

**Architecture:** A `Fund` table seeded with two rows; every `Transaction` gains a required `fundId`. The selected fund travels in the URL search param `?fund=emergency` (absent means Trip), so a fresh open always lands on Trip Fund. Server pages read `searchParams`; client components read `useSearchParams()`, because Next.js layouts do not receive `searchParams`.

**Tech Stack:** Next.js 16 (App Router, RSC), Prisma 7 + Postgres, Zod, Tailwind 4, framer-motion, vitest.

**Spec:** `docs/superpowers/specs/2026-08-14-multi-fund-design.md`

## Global Constraints

- Fund slugs are exactly `trip` and `emergency`. `trip` is the default for absent, unknown, or malformed input.
- Display names are exactly `Trip Fund` and `Emergency Fund`.
- `lib/funds.ts` must stay free of Prisma imports — client components import it.
- Never run `prisma/seed.ts` against production; it calls `deleteMany()`.
- Production currently holds 3 members and 3 transactions that must end up in Trip Fund.
- Tests run with `npm test` (vitest). Typecheck with `npx tsc --noEmit`.
- The droplet builds with `NODE_OPTIONS=--max-old-space-size=1536`; 1 GB RAM plus 2 GB swap.

---

### Task 1: Pure fund helpers

**Files:**
- Create: `lib/funds.ts`
- Test: `lib/funds.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `type FundSlug = "trip" | "emergency"`, `FUND_SLUGS: readonly FundSlug[]`, `DEFAULT_FUND_SLUG: FundSlug`, `FUND_LABELS: Record<FundSlug, string>`, `resolveFundSlug(raw: string | string[] | undefined): FundSlug`, `fundHref(path: string, slug: FundSlug): string`

- [ ] **Step 1: Write the failing test**

```ts
// lib/funds.test.ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FUND_SLUG,
  FUND_LABELS,
  fundHref,
  resolveFundSlug,
} from "./funds";

describe("resolveFundSlug", () => {
  it("defaults to trip when the param is absent", () => {
    expect(resolveFundSlug(undefined)).toBe("trip");
    expect(DEFAULT_FUND_SLUG).toBe("trip");
  });

  it("accepts the two known slugs", () => {
    expect(resolveFundSlug("trip")).toBe("trip");
    expect(resolveFundSlug("emergency")).toBe("emergency");
  });

  it("falls back to trip for anything unrecognised", () => {
    expect(resolveFundSlug("nonsense")).toBe("trip");
    expect(resolveFundSlug("")).toBe("trip");
    expect(resolveFundSlug("EMERGENCY")).toBe("trip");
  });

  it("takes the first entry of a repeated param", () => {
    expect(resolveFundSlug(["emergency", "trip"])).toBe("emergency");
    expect(resolveFundSlug([])).toBe("trip");
  });
});

describe("fundHref", () => {
  it("leaves the default fund out of the URL", () => {
    expect(fundHref("/members", "trip")).toBe("/members");
  });

  it("adds the param for the emergency fund", () => {
    expect(fundHref("/members", "emergency")).toBe("/members?fund=emergency");
  });

  it("keeps working for nested paths", () => {
    expect(fundHref("/members/abc123", "emergency")).toBe(
      "/members/abc123?fund=emergency"
    );
  });
});

describe("FUND_LABELS", () => {
  it("names both funds", () => {
    expect(FUND_LABELS.trip).toBe("Trip Fund");
    expect(FUND_LABELS.emergency).toBe("Emergency Fund");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/funds.test.ts`
Expected: FAIL — cannot resolve `./funds`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/funds.ts
/**
 * Which fund the app is showing. The slug rides in the URL rather than a
 * cookie, so opening the app fresh always lands on the Trip Fund.
 *
 * No Prisma import here on purpose: client components read this module.
 */

export type FundSlug = "trip" | "emergency";

export const FUND_SLUGS = ["trip", "emergency"] as const satisfies readonly FundSlug[];

export const DEFAULT_FUND_SLUG: FundSlug = "trip";

export const FUND_LABELS: Record<FundSlug, string> = {
  trip: "Trip Fund",
  emergency: "Emergency Fund",
};

/** Anything unrecognised resolves to the default rather than erroring. */
export function resolveFundSlug(raw: string | string[] | undefined): FundSlug {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return FUND_SLUGS.includes(value as FundSlug)
    ? (value as FundSlug)
    : DEFAULT_FUND_SLUG;
}

/** A link that keeps the current fund. The default fund stays out of the URL. */
export function fundHref(path: string, slug: FundSlug): string {
  return slug === DEFAULT_FUND_SLUG ? path : `${path}?fund=${slug}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/funds.test.ts`
Expected: PASS, 4 describe blocks.

- [ ] **Step 5: Commit**

```bash
git add lib/funds.ts lib/funds.test.ts
git commit -m "feat: add fund slug helpers"
```

---

### Task 2: Fund model and idempotent seed

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/seed-funds.ts`

**Interfaces:**
- Consumes: `FUND_LABELS`, `FUND_SLUGS` from Task 1
- Produces: a `Fund` table holding two rows, `trip` (sortOrder 0) and `emergency` (sortOrder 1)

- [ ] **Step 1: Add the Fund model**

Append to `prisma/schema.prisma`:

```prisma
model Fund {
  id           String        @id @default(cuid())
  slug         String        @unique
  name         String
  sortOrder    Int           @default(0)
  createdAt    DateTime      @default(now())
  transactions Transaction[]
}
```

- [ ] **Step 2: Write the seed script**

```ts
// prisma/seed-funds.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma";

/**
 * Creates the two funds, or leaves them alone if they already exist. Safe to
 * run against production — unlike prisma/seed.ts, this never deletes.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const FUNDS = [
  { slug: "trip", name: "Trip Fund", sortOrder: 0 },
  { slug: "emergency", name: "Emergency Fund", sortOrder: 1 },
];

async function main() {
  for (const fund of FUNDS) {
    await prisma.fund.upsert({
      where: { slug: fund.slug },
      update: { name: fund.name, sortOrder: fund.sortOrder },
      create: fund,
    });
  }
  const rows = await prisma.fund.findMany({ orderBy: { sortOrder: "asc" } });
  console.log("funds:", rows.map((f) => `${f.slug}=${f.id}`).join(" "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 3: Push the schema and seed locally**

Run:
```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed-funds.ts
```
Expected: `funds: trip=<id> emergency=<id>`.

- [ ] **Step 4: Verify the seed is idempotent**

Run: `npx tsx prisma/seed-funds.ts`
Expected: same two ids, no duplicates, no error.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed-funds.ts
git commit -m "feat: add Fund model and idempotent fund seed"
```

---

### Task 3: Attach transactions to funds

Adding a required column to a populated table fails, so this task adds it as optional, backfills, then tightens it.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/backfill-funds.ts`

**Interfaces:**
- Consumes: the `Fund` table from Task 2
- Produces: `Transaction.fundId: String` (required) with relation `fund` and index `@@index([fundId, date])`

- [ ] **Step 1: Add fundId as optional**

In `prisma/schema.prisma`, inside `model Transaction`:

```prisma
  fundId    String?
  fund      Fund?           @relation(fields: [fundId], references: [id])
```

Add alongside the existing indexes:

```prisma
  @@index([fundId, date])
```

- [ ] **Step 2: Push the optional column**

Run: `npx prisma generate && npx prisma db push`
Expected: succeeds without data loss warnings.

- [ ] **Step 3: Write the backfill**

```ts
// prisma/backfill-funds.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma";

/**
 * Files every pre-existing transaction under the Trip Fund. Only touches rows
 * with no fund yet, so running it twice is harmless.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const trip = await prisma.fund.findUnique({ where: { slug: "trip" } });
  if (!trip) throw new Error("Trip fund missing — run prisma/seed-funds.ts first.");

  const result = await prisma.transaction.updateMany({
    where: { fundId: null },
    data: { fundId: trip.id },
  });

  const orphans = await prisma.transaction.count({ where: { fundId: null } });
  console.log(`backfilled ${result.count} transaction(s); ${orphans} still unassigned`);
  if (orphans > 0) throw new Error("Some transactions have no fund.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 4: Run the backfill**

Run: `npx tsx prisma/backfill-funds.ts`
Expected: `backfilled N transaction(s); 0 still unassigned`.

- [ ] **Step 5: Make fundId required**

Change the two lines from Step 1 to:

```prisma
  fundId    String
  fund      Fund            @relation(fields: [fundId], references: [id])
```

Run: `npx prisma generate && npx prisma db push`
Expected: succeeds, because no row has a null `fundId`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/backfill-funds.ts
git commit -m "feat: attach every transaction to a fund"
```

---

### Task 4: Scope every query by fund

This is the correctness heart of the change. A helper that forgets its filter silently blends the two ledgers.

**Files:**
- Modify: `lib/queries.ts`

**Interfaces:**
- Consumes: `FundSlug`, `DEFAULT_FUND_SLUG` from Task 1
- Produces: `getFundBySlug(slug: FundSlug): Promise<{ id: string; slug: string; name: string }>`, and a required first `fundId: string` parameter on `getMembers`, `getMember`, `getRecentTransactions`, `getHomeSummary`, `getMonthlySeries`

- [ ] **Step 1: Add the fund lookup**

Add to the top of `lib/queries.ts`, after the existing imports:

```ts
import { DEFAULT_FUND_SLUG, type FundSlug } from "@/lib/funds";

export type FundView = { id: string; slug: string; name: string };

/** Look up a fund, falling back to the default if the slug is not in the table. */
export async function getFundBySlug(slug: FundSlug): Promise<FundView> {
  const fund =
    (await prisma.fund.findUnique({ where: { slug } })) ??
    (await prisma.fund.findUnique({ where: { slug: DEFAULT_FUND_SLUG } }));

  if (!fund) throw new Error("No funds exist — run prisma/seed-funds.ts.");
  return { id: fund.id, slug: fund.slug, name: fund.name };
}

export async function getFunds(): Promise<FundView[]> {
  const rows = await prisma.fund.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((f) => ({ id: f.id, slug: f.slug, name: f.name }));
}
```

- [ ] **Step 2: Scope getMembers and getMember**

In `getMembers`, change the signature to `export async function getMembers(fundId: string): Promise<MemberView[]>` and add the filter to the include:

```ts
      transactions: {
        where: { fundId },
        select: { type: true, amount: true, date: true },
        orderBy: { date: "desc" },
      },
```

In `getMember`, change the signature to `export async function getMember(id: string, fundId: string)` and change the include to:

```ts
    include: {
      transactions: {
        where: { fundId },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
    },
```

- [ ] **Step 3: Scope the remaining three helpers**

`getRecentTransactions(fundId: string, limit = 15)` — add `where: { fundId },` to the `findMany`.

`getHomeSummary(fundId: string)` — change the first promise to:

```ts
    prisma.transaction.findMany({
      where: { fundId },
      select: { type: true, amount: true, date: true },
    }),
```

`getMonthlySeries(fundId: string, months = 6)` — add `where: { fundId },` to the `findMany`.

Leave `prisma.member.count()` in `getHomeSummary` unscoped: the roster is shared, so the member count is the same in both funds.

- [ ] **Step 4: Verify nothing still reads transactions unscoped**

Run: `grep -n "prisma.transaction.findMany" -A3 lib/queries.ts`
Expected: every match shows a `where: { fundId }`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors ONLY in the four page files that have not yet been updated (they call these helpers without a fundId). That is the signal Task 6 has work to do.

- [ ] **Step 6: Commit**

```bash
git add lib/queries.ts
git commit -m "feat: scope every query by fund"
```

---

### Task 5: Accept a fund when recording an entry

**Files:**
- Modify: `app/actions.ts`

**Interfaces:**
- Consumes: `getFundBySlug` is NOT used here; the action validates a raw `fundId` against the database
- Produces: `createTransaction` requires a `fundId` field in its FormData

- [ ] **Step 1: Add fundId to the schema**

In `app/actions.ts`, add to `transactionSchema`:

```ts
  fundId: z.string().min(1, "Pick a fund."),
```

- [ ] **Step 2: Parse, validate, and store it**

In `createTransaction`, add `fundId` to the `safeParse` object:

```ts
    fundId: String(formData.get("fundId") ?? ""),
```

After the existing member lookup, add:

```ts
  const fund = await prisma.fund.findUnique({
    where: { id: parsed.data.fundId },
  });
  if (!fund) return fail("That fund no longer exists.", "fundId");
```

And add `fundId: parsed.data.fundId,` to the `prisma.transaction.create` data object.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from `app/actions.ts`.

- [ ] **Step 4: Commit**

```bash
git add app/actions.ts
git commit -m "feat: record which fund an entry belongs to"
```

---

### Task 6: Wire the fund through the pages

**Files:**
- Modify: `app/page.tsx`, `app/members/page.tsx`, `app/members/[id]/page.tsx`, `app/stats/page.tsx`

**Interfaces:**
- Consumes: `resolveFundSlug` (Task 1), `getFundBySlug` and the scoped helpers (Task 4)
- Produces: each page resolves the fund and passes `fund.id` to its queries

In Next.js 16 `searchParams` is a Promise, matching the existing `params` usage in `app/members/[id]/page.tsx`.

- [ ] **Step 1: Update the home page**

In `app/page.tsx`, add the imports and replace the function signature and data fetch:

```ts
import { getFundBySlug, getHomeSummary, getRecentTransactions } from "@/lib/queries";
import { resolveFundSlug } from "@/lib/funds";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ fund?: string | string[] }>;
}) {
  const slug = resolveFundSlug((await searchParams).fund);
  const fund = await getFundBySlug(slug);

  const [summary, recent] = await Promise.all([
    getHomeSummary(fund.id),
    getRecentTransactions(fund.id, 15),
  ]);
```

- [ ] **Step 2: Update the members list page**

```tsx
// app/members/page.tsx
import { MembersList } from "@/components/MembersList";
import { getFundBySlug, getMembers } from "@/lib/queries";
import { resolveFundSlug } from "@/lib/funds";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ fund?: string | string[] }>;
}) {
  const slug = resolveFundSlug((await searchParams).fund);
  const fund = await getFundBySlug(slug);
  const members = await getMembers(fund.id);

  return <MembersList members={members} fundName={fund.name} fundSlug={slug} />;
}
```

- [ ] **Step 3: Update the member detail page**

```tsx
// app/members/[id]/page.tsx
import { notFound } from "next/navigation";
import { MemberDetail } from "@/components/MemberDetail";
import { getFundBySlug, getMember } from "@/lib/queries";
import { resolveFundSlug } from "@/lib/funds";

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fund?: string | string[] }>;
}) {
  const { id } = await params;
  const slug = resolveFundSlug((await searchParams).fund);
  const fund = await getFundBySlug(slug);

  const data = await getMember(id, fund.id);
  if (!data) notFound();

  return (
    <MemberDetail
      member={data.member}
      transactions={data.transactions}
      fundName={fund.name}
    />
  );
}
```

- [ ] **Step 4: Update the stats page**

```ts
import { getFundBySlug, getHomeSummary, getMembers, getMonthlySeries } from "@/lib/queries";
import { resolveFundSlug } from "@/lib/funds";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ fund?: string | string[] }>;
}) {
  const slug = resolveFundSlug((await searchParams).fund);
  const fund = await getFundBySlug(slug);

  const [summary, members, series] = await Promise.all([
    getHomeSummary(fund.id),
    getMembers(fund.id),
    getMonthlySeries(fund.id, 6),
  ]);
```

Then change the `ScreenTitle` subtitle to name the fund:

```tsx
        subtitle={hasData ? `How ${fund.name} has grown` : undefined}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors only about the new `fundName` / `fundSlug` props that `MembersList` and `MemberDetail` do not accept yet — Task 8 adds them.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/members/page.tsx "app/members/[id]/page.tsx" app/stats/page.tsx
git commit -m "feat: resolve the active fund on every page"
```

---

### Task 7: The fund toggle

A small segmented pill, matching the deposit/withdrawal control already in `EntrySheet` (`components/EntrySheet.tsx:109`).

**Files:**
- Create: `components/FundToggle.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `FUND_SLUGS`, `FUND_LABELS`, `fundHref`, `type FundSlug` (Task 1)
- Produces: `<FundToggle current={slug} />`

- [ ] **Step 1: Write the toggle**

```tsx
// components/FundToggle.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { FUND_LABELS, FUND_SLUGS, fundHref, type FundSlug } from "@/lib/funds";

/** Short labels: the pill is deliberately small. */
const SHORT: Record<FundSlug, string> = {
  trip: "Trip",
  emergency: "Emergency",
};

export function FundToggle({ current }: { current: FundSlug }) {
  const pathname = usePathname();

  return (
    <div
      role="tablist"
      aria-label="Which fund to show"
      className="mx-auto mb-4 grid w-[13.5rem] grid-cols-2 gap-1 rounded-full bg-ink/5 p-1"
    >
      {FUND_SLUGS.map((slug) => {
        const active = slug === current;
        return (
          <Link
            key={slug}
            href={fundHref(pathname, slug)}
            role="tab"
            aria-selected={active}
            aria-label={FUND_LABELS[slug]}
            replace
            scroll={false}
            className="relative rounded-full py-1.5 text-center text-[11px] font-bold"
          >
            {active && (
              <motion.span
                layoutId="fund-pill"
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
                className="absolute inset-0 rounded-full bg-white shadow-[0_4px_12px_-6px_rgba(23,50,74,0.6)]"
              />
            )}
            <span className={`relative ${active ? "text-ink" : "text-ink-faint"}`}>
              {SHORT[slug]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Put it on the home screen**

In `app/page.tsx`, import it:

```ts
import { FundToggle } from "@/components/FundToggle";
```

Render it directly above the total card — immediately before the `{/* Total amount collected */}` comment:

```tsx
      <FundToggle current={slug} />
```

- [ ] **Step 3: Check it renders and switches**

Run: `npm run dev`, open `http://localhost:3000/`
Expected: a small two-segment pill; tapping Emergency navigates to `/?fund=emergency`, the pill moves, and the total changes to the Emergency Fund's figure.

- [ ] **Step 4: Commit**

```bash
git add components/FundToggle.tsx app/page.tsx
git commit -m "feat: add the fund toggle to the home screen"
```

---

### Task 8: Keep the fund while navigating

Without this, tapping Members drops you back to Trip Fund mid-session.

**Files:**
- Modify: `components/BottomNav.tsx`, `components/MembersList.tsx`, `components/MemberDetail.tsx`

**Interfaces:**
- Consumes: `resolveFundSlug`, `fundHref`, `FUND_LABELS` (Task 1)
- Produces: `MembersList` accepts `fundName: string` and `fundSlug: FundSlug`; `MemberDetail` accepts `fundName: string`

- [ ] **Step 1: Carry the fund through the bottom nav**

In `components/BottomNav.tsx`, add imports:

```ts
import { useSearchParams } from "next/navigation";
import { fundHref, resolveFundSlug } from "@/lib/funds";
```

Inside `BottomNav`, read the current fund:

```ts
  const searchParams = useSearchParams();
  const fund = resolveFundSlug(searchParams.get("fund") ?? undefined);
```

Pass it to each tab by changing both `.map` calls to `<Tab key={tab.href} {...tab} active={isActive(tab.href)} fund={fund} />`, then in `Tab` accept `fund: FundSlug` and use `href={fundHref(href, fund)}`. Import the type with `import { type FundSlug } from "@/lib/funds";`.

- [ ] **Step 2: Carry the fund into member links**

In `components/MembersList.tsx`, accept the two new props and use them: add `fundName: string; fundSlug: FundSlug` to the component's props type, render a small label above the list — `<p className="mb-2 text-center text-[11px] font-bold text-ink-faint">{fundName}</p>` — and wrap every member `href` with `fundHref(...)`, importing `fundHref` and `type FundSlug` from `@/lib/funds`.

- [ ] **Step 3: Show the fund on the member detail screen**

In `components/MemberDetail.tsx`, add `fundName: string` to the props type and render it under the member's name as `<p className="text-[11px] font-bold text-ink-faint">{fundName}</p>`, so a balance is never shown without saying which fund it belongs to.

- [ ] **Step 4: Typecheck and test the round trip**

Run: `npx tsc --noEmit && npm test`
Expected: clean typecheck, 34 tests passing.

Then with `npm run dev`: switch to Emergency on home, tap Members, tap a member. The fund label should read "Emergency Fund" at each step and the URL should keep `?fund=emergency`.

- [ ] **Step 5: Commit**

```bash
git add components/BottomNav.tsx components/MembersList.tsx components/MemberDetail.tsx
git commit -m "feat: keep the selected fund while navigating"
```

---

### Task 9: Choose the fund when adding an entry

`EntrySheet` renders from the layout, which never receives `searchParams`, so it reads the fund from `useSearchParams()` instead.

**Files:**
- Modify: `components/EntrySheet.tsx`, `app/layout.tsx`, `components/AppShell.tsx`

**Interfaces:**
- Consumes: `getFunds` (Task 4), `resolveFundSlug` (Task 1), `createTransaction` (Task 5)
- Produces: `AppShell` accepts `funds: { id: string; slug: string; name: string }[]` and passes them to `EntrySheet`

- [ ] **Step 1: Load the funds in the layout**

In `app/layout.tsx`, import `getFunds` from `@/lib/queries` and add it to the existing `Promise.all`:

```ts
  const [members, admin, funds] = await Promise.all([
    prisma.member.findMany({
      select: { id: true, name: true, photoUrl: true },
      orderBy: { name: "asc" },
    }),
    isAdmin(),
    getFunds(),
  ]);
```

Then pass it down: `<AppShell members={members} isAdmin={admin} funds={funds}>`.

- [ ] **Step 2: Thread it through AppShell**

In `components/AppShell.tsx`, add `export type FundOption = { id: string; slug: string; name: string };`, add `funds: FundOption[]` to the `AppShell` props type, and pass `funds={funds}` to `<EntrySheet ... />`.

- [ ] **Step 3: Add the selector to the entry sheet**

In `components/EntrySheet.tsx`, add imports:

```ts
import { useSearchParams } from "next/navigation";
import { resolveFundSlug } from "@/lib/funds";
import type { FundOption } from "@/components/AppShell";
```

Add `funds: FundOption[]` to `EntrySheetProps`. Inside `EntryForm`, default the selection to the fund being viewed:

```ts
  const searchParams = useSearchParams();
  const activeSlug = resolveFundSlug(searchParams.get("fund") ?? undefined);
  const [fundId, setFundId] = useState(
    () => funds.find((f) => f.slug === activeSlug)?.id ?? funds[0]?.id ?? "",
  );
```

Send it with the entry, immediately after the `memberId` line in `submit()`:

```ts
    data.set("fundId", fundId);
```

Render a selector above the deposit/withdrawal control, reusing the same segmented pattern:

```tsx
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-ink/5 p-1">
            {funds.map((fund) => {
              const active = fund.id === fundId;
              return (
                <button
                  key={fund.id}
                  type="button"
                  onClick={() => setFundId(fund.id)}
                  className={`rounded-xl py-2 text-xs font-bold ${
                    active ? "bg-white text-ink shadow-sm" : "text-ink-faint"
                  }`}
                >
                  {fund.name}
                </button>
              );
            })}
          </div>
```

Also include `fundId` in the sheet's remount key so switching funds gives a clean form: in `EntrySheet`, change `generation` to `` `${props.preselectedId ?? "none"}` `` unchanged — no change needed, since the form already remounts on open.

- [ ] **Step 4: Verify the money lands in the right fund**

Run: `npm run dev`. On home, switch to Emergency, tap `+`, confirm the sheet pre-selects "Emergency Fund", and save a ₹100 deposit. Expected: the Emergency total rises by ₹100 and the Trip total is unchanged when you toggle back.

- [ ] **Step 5: Commit**

```bash
git add components/EntrySheet.tsx components/AppShell.tsx app/layout.tsx
git commit -m "feat: choose the fund when adding an entry"
```

---

### Task 10: Deploy

The schema and backfill must land before the new code serves traffic, or the app queries a column that does not exist.

**Files:** none — this task runs commands against the droplet.

- [ ] **Step 1: Full local check**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 34 tests pass, clean typecheck, successful build.

- [ ] **Step 2: Sync the code without restarting the app**

```bash
cd "/Users/apple/Documents/PP/MISHKATH-FAMILY-FUND-COLLECTION"
rsync -az -e "ssh -i $HOME/mishkath-keygen" \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude app/generated --exclude .env --exclude tsconfig.tsbuildinfo \
  --exclude public/uploads \
  ./ root@168.144.18.108:/opt/mishkath-fund/app/
ssh -i ~/mishkath-keygen root@168.144.18.108 'chown -R mishkath:mishkath /opt/mishkath-fund'
```

- [ ] **Step 3: Migrate the database in order**

```bash
ssh -i ~/mishkath-keygen root@168.144.18.108 'cd /opt/mishkath-fund/app && \
  sudo -u mishkath npm install --no-audit --no-fund && \
  sudo -u mishkath npx prisma generate && \
  sudo -u mishkath npx prisma db push && \
  sudo -u mishkath npx tsx prisma/seed-funds.ts && \
  sudo -u mishkath npx tsx prisma/backfill-funds.ts'
```

Expected: `funds: trip=<id> emergency=<id>` then `backfilled 3 transaction(s); 0 still unassigned`.

Note: the committed schema already has `fundId` required. `db push` on a populated table will refuse or warn. If it does, temporarily relax the column to `String?` on the server, push, run the backfill, restore the required version, and push again — the same three-step order as Task 3.

- [ ] **Step 4: Build and restart**

```bash
ssh -i ~/mishkath-keygen root@168.144.18.108 \
  'cd /opt/mishkath-fund/app && sudo -u mishkath env NODE_OPTIONS=--max-old-space-size=1536 npm run build && systemctl restart mishkath-fund'
```

Expected: build completes (roughly 4 minutes on this droplet), service returns to `active`.

- [ ] **Step 5: Verify fund isolation on the live site**

```bash
ssh -i ~/mishkath-keygen root@168.144.18.108 'source /root/.mishkath-db-credentials; \
  PGPASSWORD="$DBPASS" psql -h 127.0.0.1 -U mishkath -d mishkath_fund -tAc \
  "select f.slug, count(t.id), coalesce(sum(t.amount),0) from \"Fund\" f left join \"Transaction\" t on t.\"fundId\"=f.id group by f.slug order by f.slug;"'
curl -s -o /dev/null -w "trip %{http_code}\n" https://fundcollection.mishkath.com/
curl -s -o /dev/null -w "emergency %{http_code}\n" "https://fundcollection.mishkath.com/?fund=emergency"
```

Expected: `emergency|0|0` and `trip|3|<the existing total>`; both URLs return 200.

- [ ] **Step 6: Commit the plan's completion**

```bash
git add -A
git commit -m "feat: two funds, trip and emergency"
```

---

## Self-Review

**Spec coverage:** Fund table (Task 2), transaction relation and migration (Task 3), query scoping (Task 4), action validation (Task 5), page wiring (Task 6), toggle (Task 7), nav persistence and fund labels (Task 8), entry sheet selector (Task 9), deployment and isolation check (Task 10). `lib/funds.ts` tests (Task 1) cover every case the spec's testing section lists.

**Known gap:** the spec's "no combined total" decision needs no task — it is satisfied by doing nothing.

**Type consistency:** `FundSlug`, `FUND_LABELS`, `fundHref`, `resolveFundSlug` (Task 1) are used with the same names in Tasks 6–9. `getFundBySlug` / `getFunds` return `FundView` (Task 4), which matches the `FundOption` shape used in Task 9. The scoped helpers take `fundId` as the first parameter everywhere except `getMember`, where it follows the member id — Task 6's call sites match.
