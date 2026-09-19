# Mishkath

A mobile-first web app for tracking what each family member has saved into the
shared fund.
Installs to the home screen and behaves like a native app: frosted glass bottom
navigation, spring sheets, count-up balances, pastel aurora background.

## Screens

| Screen | What it shows |
|---|---|
| **Home** | Total pool with a count-up, this-month change, and the 15 latest transactions |
| **Members** | Search, sorted A→Z under sticky letter headers, each with a photo and balance |
| **Member** | Big avatar, balance, invested/withdrawn split, and full history grouped by month |
| **+ Add** | Bottom sheet: deposit or withdrawal, amount, member, date, note |
| **Stats** | Pool growth chart, month-by-month table, top savers, headline tiles |
| **/admin** | Admin sign-in. Signed in, the + button and edit controls appear everywhere |

## Setup

Requires Node 20+ and a local PostgreSQL server.

```bash
npm install

# 1. Point at your database and set the admin password
cp .env.example .env      # then edit DATABASE_URL, ADMIN_PASSWORD, AUTH_SECRET

# 2. Create the database and its tables
createdb savings_tracker
npm run db:push

# 3. Optional: sample members and six months of deposits
npm run db:seed

# 4. Run it
npm run dev               # http://localhost:3000
```

### This machine's setup

`.env` points at the Homebrew `postgresql@14` instance on **port 5433**, kept off
the default port so it never collides with the PostgreSQL 17 install in
`/Library/PostgreSQL/17`. Start it after a reboot with:

```bash
/opt/homebrew/opt/postgresql@14/bin/pg_ctl \
  -D /opt/homebrew/var/postgresql@14 -o "-p 5433" \
  -l /opt/homebrew/var/log/postgresql@14.log start
```

Open it on your phone by visiting your machine's LAN address
(`http://<your-ip>:3000`), then "Add to Home Screen" for the full-screen app.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests for the money and grouping logic |
| `npm run lint` | ESLint |
| `npm run db:push` | Sync `prisma/schema.prisma` to the database |
| `npm run db:seed` | Replace all data with the sample set |
| `npm run db:studio` | Browse the data in Prisma Studio |

## Who can do what

Anyone who opens the app can **view** everything — totals, members, balances,
history, stats. Nothing is editable and no write controls are rendered.

Adding, editing and deleting require the admin session. Sign in at **`/admin`**
with `ADMIN_PASSWORD`; the session is a signed, http-only cookie that lasts 30
days, and `/admin` also signs you out.

The gate is enforced on the **server**: every mutating action in
`app/actions.ts` calls `denyIfNotAdmin()` before touching the database, so a
crafted request that skips the UI is still refused. Hiding buttons is only the
cosmetic half. Five wrong passwords blocks further attempts for five minutes.

## Going live

Two things change and nothing else:

1. `DATABASE_URL` in the hosting environment points at the hosted Postgres.
2. Member photos currently write to `public/uploads`, which is not durable on
   serverless hosts. Swap the two functions in `lib/storage.ts` for object
   storage; no other file touches the filesystem.

Set a strong `ADMIN_PASSWORD` and a fresh `AUTH_SECRET` in the hosting
environment. Viewers need no credentials, so the URL can be shared with the
family as-is.

## Layout

```
app/
  actions.ts        Server actions: create/update/delete, all Zod-validated
  layout.tsx        Fonts, PWA metadata, aurora, app shell
  page.tsx          Home
  members/          List and member detail
  stats/            Charts and totals
components/         UI, motion primitives, sheets, bottom nav, icons
lib/
  auth.ts           Admin password check and signed session cookie
  db.ts             Prisma client (pg adapter)
  queries.ts        Read helpers — balances are always computed, never stored
  money.ts          ₹ formatting, parsing, balance maths      (unit tested)
  grouping.ts       A→Z buckets, month buckets, dates, avatars (unit tested)
  storage.ts        Photo upload boundary
prisma/             Schema and seed
```

Balances are never stored — they are derived from transactions on every read, so
a member's balance can never drift out of sync with their history.
# friendlyfund
