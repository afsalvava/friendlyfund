# Migrate the database to Firebase (Firestore + Auth)

**Date:** 2026-09-19
**Status:** Approved, ready for implementation

## Goal

Replace Postgres/Prisma with Firestore as the data store for FriendlyFund
(this project only — the production Mishkath app keeps Postgres untouched).
Admin login also moves from a custom password-in-env-var + HMAC cookie to
real Firebase Authentication, behind the same single-password UI. No other
functionality, labels, navigation, or visual design changes.

## Decisions

| Question | Decision |
|---|---|
| Firebase product | Firestore (not Realtime Database) |
| Scope | FriendlyFund only |
| Auth | Also migrate to Firebase Auth, one fixed admin account, same password-only sign-in UI |
| Existing data | Migrate the current Postgres data ("Sha" member + transaction) into Firestore, preserving IDs |
| Firestore security rules | Left locked-down/default — all reads and writes go through the Admin SDK server-side, which bypasses rules entirely. The browser never talks to Firestore directly. |
| Member photo storage | Unchanged (local filesystem via `lib/storage.ts`) — out of scope, only the database moves |
| Realtime listeners | Not introduced. Server Components keep fetching fresh data per-request via the Admin SDK, same `revalidatePath` pattern as today |

## Prerequisites (user completes in Firebase console)

1. Firestore Database created (Native mode).
2. Authentication → Sign-in method → Email/Password provider enabled.

## Credentials & config

- `friendly-fund-adminsdk.json` (service account) — already placed in the
  project root and gitignored (`*firebase-adminsdk*.json`, `*-adminsdk.json`).
  Referenced via `GOOGLE_APPLICATION_CREDENTIALS=./friendly-fund-adminsdk.json`
  in `.env`.
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`,
  `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` —
  from the web app config the user provided. `measurementId`/Analytics is
  dropped; not needed.

## Data model

Flat top-level collections, preserving current Prisma `cuid()` IDs as
Firestore document IDs during migration so `/members/{id}` links keep
working without a redirect layer.

```
members/{id}
  name: string
  photoUrl: string | null
  createdAt: Timestamp

transactions/{id}
  memberId: string
  type: "DEPOSIT" | "WITHDRAWAL"
  amount: number          // rupees, same float-rounded convention lib/money.ts already uses
  date: Timestamp
  note: string | null
  createdAt: Timestamp

pushSubscriptions/{id}
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
  createdAt: Timestamp
  failureCount: number
```

No relational fields needed beyond `memberId` on transactions — the same
flat shape Prisma already used. Money stays a plain JS number; the app
already converts Prisma's `Decimal` to `Number(...)` everywhere it reads
amounts, so there's no behavior change.

## Data access layer

New files:
- `lib/firebase-admin.ts` — initializes the Admin SDK singleton (mirrors
  today's `lib/db.ts` Prisma singleton pattern), exports `db` (Firestore
  instance) and `auth` (Admin Auth instance).
- `lib/firebase-client.ts` — initializes the client SDK from
  `NEXT_PUBLIC_FIREBASE_*` env vars, exports `clientAuth` for the sign-in
  form. No Analytics.

Rewritten, same public function signatures (callers — every page and
component — are unaffected):
- `lib/queries.ts` — `getMembers`, `getMember`, `getRecentTransactions`,
  `getHomeSummary`, `getMonthlySeries` swap `prisma.*.findMany(...)` for
  Firestore collection reads. The JS-side aggregation logic (reduce/filter
  for balances, monthly grouping) is unchanged — it already didn't rely on
  SQL `GROUP BY`.
- `app/actions.ts` — `createMember`, `updateMember`, `deleteMember`,
  `createTransaction`, `deleteTransaction` swap Prisma writes for Firestore
  writes (`.add()`, `.update()`, `.delete()`).
- `lib/push.ts` — subscription storage swaps to the `pushSubscriptions`
  collection.

Removed: `lib/db.ts`, `prisma/` (schema, seed scripts, migrations),
`app/generated/prisma`, `prisma.config.ts`, the `prisma`/`@prisma/client`/
`@prisma/adapter-pg` npm packages, `DATABASE_URL`.

## Auth flow

1. One-time script creates a single Firebase Auth user,
   `admin@friendlyfund.internal`, with the current admin password
   (`pQpFRL6XP0ejNPSX`) — so the credential the user types doesn't change.
2. `components/AdminPanel.tsx`'s login form becomes a client component that
   calls `signInWithEmailAndPassword(clientAuth, FIXED_EMAIL, password)`
   directly (Firebase requires the client SDK for password verification —
   the Admin SDK has no "check this password" API by design).
3. On success, the ID token is handed to the `login` server action, which
   verifies it (`getAuth().verifyIdToken`) and creates a Firebase session
   cookie (`getAuth().createSessionCookie`), replacing today's
   HMAC-signed cookie.
4. `lib/auth.ts`'s `isAdmin()` verifies that session cookie via the Admin
   SDK instead of comparing against `ADMIN_PASSWORD`/`AUTH_SECRET`.
   `checkPassword`, `sign`, `safeEquals`, `suggestSecret` are deleted.
5. The custom in-memory brute-force limiter in `app/admin/actions.ts` is
   removed — Firebase Auth has its own built-in throttling on repeated
   failed sign-ins.
6. `AUTH_SECRET` and `ADMIN_PASSWORD` env vars are removed.

## Migration script

`prisma/migrate-to-firestore.ts` (one-time, run manually): reads all
members, transactions, and push subscriptions via the existing Prisma
client, writes matching documents to Firestore via the Admin SDK, preserving
IDs. Left in place after the fact isn't necessary — it's deleted along with
the rest of `prisma/` once migration is verified.

## Testing

- `lib/auth.test.ts` — tests for deleted functions (`checkPassword`, `sign`,
  etc.) are removed; `cookieSecure()` tests (pure, unaffected) stay.
- `lib/money.test.ts`, `lib/grouping.test.ts`, `lib/push-messages.test.ts`,
  `lib/storage.test.ts` — untouched, none of them touch the database layer.
- `lib/queries.ts`/`app/actions.ts` have no existing unit tests (they're
  DB-touching, previously exercised only manually) — that stays true after
  the swap; verification is manual, same as it's been throughout this
  project's development.

## Rollout order

1. User completes the two Firebase console prerequisites.
2. Implement `lib/firebase-admin.ts` / `lib/firebase-client.ts`, add env vars.
3. Create the fixed admin user via a one-off script.
4. Rewrite `lib/queries.ts`, `app/actions.ts`, `lib/push.ts`, `lib/auth.ts`,
   `app/admin/actions.ts`, `components/AdminPanel.tsx`.
5. Run the migration script, verify the "Sha" data appears correctly.
6. Manually verify: sign in, sign out, add/edit/delete a member, add/delete
   a transaction, push-subscribe flow, home/members/stats pages all render.
7. Remove Prisma entirely (files, `app/generated/prisma`, npm packages,
   `DATABASE_URL`).
8. `tsc --noEmit`, `npm test`, `eslint` all clean.
