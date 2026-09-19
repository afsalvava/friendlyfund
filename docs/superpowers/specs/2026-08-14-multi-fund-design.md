# Multi-fund support: Trip Fund and Emergency Fund

**Date:** 2026-08-14
**Status:** Approved, ready for implementation

## Goal

Split the ledger in two. Every transaction belongs to exactly one fund — Trip
Fund or Emergency Fund — and the whole app shows one fund at a time. Trip Fund
is the default, and the three transactions already in production belong to it.

## Decisions

| Question | Decision |
|---|---|
| Toggle scope | The whole app. Home total, member balances, stats, and recent entries all scope to the selected fund. |
| Fund storage | A `Fund` table seeded with two rows, not an enum. A third fund later is a row, not a migration. |
| Member roster | Shared. One `Member` list; balances become per-fund. |
| Persistence | None. A fresh open always lands on Trip Fund. |
| Carrying the fund | URL search param, `?fund=emergency`. Absent means Trip. |
| Entry sheet | Defaults to the current fund, with a visible selector to override. |
| Combined total | Out of scope. No screen shows both funds summed. |

## Data model

```prisma
model Fund {
  id           String        @id @default(cuid())
  slug         String        @unique   // "trip" | "emergency"
  name         String                  // "Trip Fund" | "Emergency Fund"
  sortOrder    Int           @default(0)
  createdAt    DateTime      @default(now())
  transactions Transaction[]
}

model Transaction {
  // existing fields unchanged
  fundId String
  fund   Fund   @relation(fields: [fundId], references: [id])

  @@index([fundId, date])
}
```

`Member` is unchanged. Deleting a fund is not supported; the relation has no
cascade, so Postgres refuses to drop a fund that still holds transactions.

## Migration

Production holds 3 members and 3 transactions. A required `fundId` cannot be
added to a populated table in one step, so the rollout is ordered:

1. Add the `Fund` model, push, and seed both funds by upsert on `slug`.
2. Add `fundId` as **optional**, push, and backfill every existing transaction
   to Trip Fund.
3. Make `fundId` **required**, push.

The seed must be idempotent and must never delete. `prisma/seed.ts` calls
`deleteMany()` on transactions and members, so fund seeding lives in a separate
script that is safe to run against production.

Deployment order matters: the schema and backfill must land before the new code
serves traffic, or the app queries a column that does not exist yet.

## Why a URL param rather than a cookie

The requirement is that the whole app scopes to one fund, but a fresh open
returns to Trip Fund. A session cookie cannot deliver the second half: mobile
browsers keep session cookies alive for weeks, so the choice would persist.

A URL param satisfies both. Opening the app at `/` has no param, so it resolves
to Trip. Within a session the bottom nav and member links carry the param, so
Members and Stats stay on the fund being viewed. The cost is threading the param
through navigation links; the incidental benefit is that a fund view is
shareable.

Unknown or malformed slugs resolve to Trip rather than erroring.

## Components

**`lib/funds.ts`** (new) — the only place that knows about slugs.

- `FUND_SLUGS` and `DEFAULT_FUND_SLUG`
- `resolveFundSlug(raw: string | string[] | undefined): FundSlug` — pure,
  defaults to `trip` for absent, unknown, or malformed input
- `fundHref(path: string, slug: FundSlug): string` — builds a nav link that
  preserves the fund, omitting the param for Trip so default URLs stay clean
- `getFunds()` / `getFundBySlug()` — database reads

**`lib/queries.ts`** — every helper takes a `fundId` and filters on it:
`getMembers`, `getMember`, `getRecentTransactions`, `getHomeSummary`,
`getMonthlySeries`. A missing filter silently mixes funds, which is the main
correctness risk in this change.

**`app/actions.ts`** — `createTransaction` accepts and validates `fundId`
against the database. Writes remain admin-only; the fund is not a permission
boundary.

**`components/FundToggle.tsx`** (new) — a small segmented pill, Trip ·
Emergency, on the home screen. Switching navigates to the same path with the new
param.

**Pages** — `app/page.tsx`, `app/members/page.tsx`, `app/members/[id]/page.tsx`,
and `app/stats/page.tsx` read `searchParams`, resolve the fund, and pass its id
down. Members and Stats show a small text label naming the current fund rather
than a second toggle.

**`components/EntrySheet.tsx`** — a Trip/Emergency selector defaulting to the
current fund.

**`BottomNav`, `MembersList`, `MemberDetail`** — links preserve the fund param.

## Testing

Unit tests, in the existing vitest setup, cover `lib/funds.ts`:

- absent param resolves to Trip
- unknown or malformed slug resolves to Trip
- a valid slug resolves to that fund
- an array-valued param (`?fund=a&fund=b`) resolves deterministically
- `fundHref` omits the param for Trip and includes it for Emergency

The query helpers need a live database, so fund isolation is verified against
the server after deploy: a deposit recorded in one fund must leave the other
fund's total unchanged.

## Risks

- **A query missing its fund filter** silently blends the two ledgers. Every
  helper in `lib/queries.ts` must be checked, since none of them filter today.
- **The backfill running twice** is harmless because it only touches rows where
  `fundId` is null.
- **`prisma/seed.ts` run against production** would wipe real data. It is not
  part of the deploy path and stays that way.
