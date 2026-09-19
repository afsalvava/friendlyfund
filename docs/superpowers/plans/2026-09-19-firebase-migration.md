# Firebase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Postgres/Prisma with Firestore as FriendlyFund's data store, and replace the custom password/HMAC-cookie admin login with Firebase Authentication behind the same single-password UI.

**Architecture:** All reads/writes go through the Firebase Admin SDK from Server Components and Server Actions only — the browser never talks to Firestore directly, so default (locked-down) security rules are fine. Every existing function signature in `lib/queries.ts` and `app/actions.ts` stays the same; only their internals change. Instead of per-collection filtered queries (which would need Firestore composite indexes), reads fetch each collection in full, ordered by a single field, and do member/date grouping in JS — exactly the pattern `getHomeSummary`/`getMonthlySeries` already use today. This avoids any Firestore index configuration.

**Tech Stack:** Next.js 16 (App Router, Server Components/Actions), `firebase-admin` (server), `firebase` (client, Auth only), TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-19-firebase-migration-design.md`

## Global Constraints

- Firestore Database (Native mode) and Authentication → Email/Password must already be enabled in the `friendlyfund-8d261` Firebase console project (user-completed prerequisite — verify in Task 1 before writing any code).
- `friendly-fund-adminsdk.json` lives at the project root and is already gitignored. Never print its `private_key` field to a commit, log, or terminal output beyond what's needed to load it.
- No new Firestore security rules are written — the Admin SDK bypasses rules by design, and the client SDK is used only for Auth, never for Firestore reads/writes.
- The fixed admin account is `admin@friendlyfund.internal`, password `pQpFRL6XP0ejNPSX` (today's current admin password — the login UX must not change for the user).
- Every task ends with `npx tsc --noEmit`, `npm test`, and `npx eslint .` all clean, in addition to the task's own verification steps.

---

## File Structure

New files:
- `lib/firebase-admin.ts` — Admin SDK singleton (`adminDb`, `adminAuth`), mirrors today's `lib/db.ts` pattern.
- `lib/firebase-client.ts` — client SDK singleton (`clientAuth`), used only by the sign-in form.
- `lib/push-subscriptions.ts` — Firestore access for the `pushSubscriptions` collection, shared by `lib/push.ts` and the two push API routes (both currently call Prisma directly).
- `scripts/create-admin-user.ts` — one-off script, creates the fixed Firebase Auth user.
- `prisma/migrate-to-firestore.ts` — one-off script, copies existing Postgres data into Firestore. Deleted along with the rest of `prisma/` in the cleanup task.

Modified files:
- `lib/auth.ts` — session logic rewritten around Firebase session cookies.
- `app/admin/actions.ts` — `login` takes an ID token instead of a password; brute-force limiter removed.
- `components/AdminPanel.tsx` — becomes the place that calls Firebase client-side sign-in.
- `lib/queries.ts`, `app/actions.ts` — Prisma calls replaced with Firestore calls; signatures unchanged.
- `lib/push.ts`, `app/api/push/subscribe/route.ts`, `app/api/push/unsubscribe/route.ts` — use `lib/push-subscriptions.ts` instead of Prisma.
- `.env`, `.env.example` — new Firebase env vars; `DATABASE_URL`/`ADMIN_PASSWORD`/`AUTH_SECRET` removed.
- `package.json` — add `firebase`, `firebase-admin`; remove `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `@types/pg`, and the `db:*` scripts.

Deleted files (final cleanup task only): `lib/db.ts`, `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrate-to-firestore.ts`, `prisma.config.ts`, `app/generated/prisma/`.

---

### Task 1: Verify prerequisites, install SDKs, wire up env vars

**Files:**
- Modify: `.env`, `.env.example`, `package.json`

**Interfaces:**
- Produces: the env vars every later task reads — `GOOGLE_APPLICATION_CREDENTIALS`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.

- [ ] **Step 1: Confirm the Firebase console prerequisites are done**

Ask the user to confirm (or check yourself if you have console access) that both are true for the `friendlyfund-8d261` project:
- Firestore Database exists (Native mode).
- Authentication → Sign-in method → Email/Password is enabled.

Do not proceed past this step until both are confirmed — every later task depends on them.

- [ ] **Step 2: Install the Firebase SDKs**

Run: `npm install firebase-admin firebase`

- [ ] **Step 3: Add the Firebase env vars**

Edit `.env`, replacing the `DATABASE_URL`/`ADMIN_PASSWORD`/`AUTH_SECRET` block with:

```
GOOGLE_APPLICATION_CREDENTIALS="./friendly-fund-adminsdk.json"

NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyAAyjLZ1Tww0iJSzOepGDLe2GMxqcpUS18"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="friendlyfund-8d261.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="friendlyfund-8d261"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="friendlyfund-8d261.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1033247929144"
NEXT_PUBLIC_FIREBASE_APP_ID="1:1033247929144:web:eab90154a3de04ae5247cd"
```

Keep the existing `NODE_ENV`, `COOKIE_SECURE`, `UPLOADS_DIR`, and `VAPID_*` lines untouched — none of those are part of this migration.

- [ ] **Step 4: Update `.env.example` to match**

Replace its `DATABASE_URL`/`ADMIN_PASSWORD`/`AUTH_SECRET` lines with the same six `NEXT_PUBLIC_FIREBASE_*` keys (empty placeholder values) plus `GOOGLE_APPLICATION_CREDENTIALS="./friendly-fund-adminsdk.json"`, so a future setup knows what to fill in.

- [ ] **Step 5: Verify the install**

Run: `npx tsc --noEmit`
Expected: passes (no new code imports these packages yet, so this just confirms the install didn't break anything).

- [ ] **Step 6: Commit**

```bash
git add .env.example package.json package-lock.json
git commit -m "Install Firebase SDKs and add Firebase env vars"
```

(`.env` itself is gitignored — nothing to add there.)

---

### Task 2: `lib/firebase-admin.ts` — Admin SDK singleton

**Files:**
- Create: `lib/firebase-admin.ts`

**Interfaces:**
- Produces: `adminDb: Firestore`, `adminAuth: Auth` — every later server-side task imports one or both of these.

- [ ] **Step 1: Write the singleton**

```typescript
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * A single Firebase Admin app per process. Next.js hot-reloads modules in
 * dev, so re-running initializeApp() on every reload would throw — reuse
 * the existing app if one is already registered.
 */
const app = getApps()[0] ?? initializeApp({ credential: cert(credentialsPath()) });

function credentialsPath(): string {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is not set. Add it to .env."
    );
  }
  return path;
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
```

- [ ] **Step 2: Verify it loads the credentials correctly**

Create a scratch file `scripts-tmp-smoke.ts` at the project root:

```typescript
import "dotenv/config";
import { adminDb } from "./lib/firebase-admin";

async function main() {
  const ref = await adminDb.collection("_smoke").add({ ok: true, at: new Date() });
  const snap = await ref.get();
  console.log("wrote and read back:", snap.data());
  await ref.delete();
  console.log("cleaned up");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Run: `npx tsx scripts-tmp-smoke.ts`
Expected: prints `wrote and read back: { ok: true, at: <Date> }` then `cleaned up`, with no errors. If it throws about credentials, double check `GOOGLE_APPLICATION_CREDENTIALS` in `.env` and that `friendly-fund-adminsdk.json` is at the project root.

Delete `scripts-tmp-smoke.ts` after this passes — it's throwaway.

- [ ] **Step 3: Run the full check**

Run: `npx tsc --noEmit && npm test && npx eslint .`
Expected: all clean.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase-admin.ts
git commit -m "Add Firebase Admin SDK singleton"
```

---

### Task 3: `lib/firebase-client.ts` — client SDK singleton

**Files:**
- Create: `lib/firebase-client.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_FIREBASE_*` env vars from Task 1.
- Produces: `clientAuth: Auth` — consumed by `components/AdminPanel.tsx` in Task 7.

- [ ] **Step 1: Write the singleton**

```typescript
"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

/**
 * Auth only — this app never reads or writes Firestore from the browser.
 * All data access goes through the Admin SDK on the server.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps()[0] ?? initializeApp(firebaseConfig);

export const clientAuth = getAuth(app);
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: passes. (Full behavioral verification happens in Task 7, once something actually calls `signInWithEmailAndPassword`.)

- [ ] **Step 3: Commit**

```bash
git add lib/firebase-client.ts
git commit -m "Add Firebase client SDK singleton for Auth"
```

---

### Task 4: Create the fixed admin user

**Files:**
- Create: `scripts/create-admin-user.ts`

**Interfaces:**
- Consumes: `adminAuth` from Task 2.
- Produces: a Firebase Auth user `admin@friendlyfund.internal` — consumed by Task 6/7's sign-in flow.

- [ ] **Step 1: Write the script**

```typescript
import "dotenv/config";
import { adminAuth } from "../lib/firebase-admin";

const EMAIL = "admin@friendlyfund.internal";
const PASSWORD = "pQpFRL6XP0ejNPSX";

async function main() {
  try {
    const existing = await adminAuth.getUserByEmail(EMAIL);
    console.log(`Admin user already exists: ${existing.uid}`);
    return;
  } catch (err) {
    if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
  }

  const user = await adminAuth.createUser({ email: EMAIL, password: PASSWORD });
  console.log(`Created admin user: ${user.uid}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Run it**

Run: `npx tsx scripts/create-admin-user.ts`
Expected: prints `Created admin user: <uid>`. Running it again should print `Admin user already exists: <uid>` — confirms the script is idempotent.

- [ ] **Step 3: Verify in the Firebase console**

Firebase console → Authentication → Users tab should now show one user, `admin@friendlyfund.internal`.

- [ ] **Step 4: Commit**

```bash
git add scripts/create-admin-user.ts
git commit -m "Add script to create the fixed Firebase Auth admin user"
```

---

### Task 5: Rewrite `lib/auth.ts` for Firebase session cookies

**Files:**
- Modify: `lib/auth.ts`
- Modify: `lib/auth.test.ts`

**Interfaces:**
- Consumes: `adminAuth` from Task 2.
- Produces: `isAdmin(): Promise<boolean>` (unchanged signature), `createSessionFromIdToken(idToken: string): Promise<void>` (new, replaces `startSession`), `endSession(): Promise<void>` (unchanged signature), `requireAdmin(): Promise<void>` (unchanged), `NotAdminError` (unchanged), `cookieSecure` (unchanged) — `app/admin/actions.ts` in Task 6 calls `createSessionFromIdToken` and `endSession`; `app/actions.ts` (already written, untouched) keeps calling `isAdmin()`.

- [ ] **Step 1: Rewrite the file**

```typescript
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

/**
 * A single admin, authenticated through Firebase Auth. The session is a
 * Firebase session cookie — Firebase verifies it, nothing is checked by
 * hand here.
 */

const COOKIE = "mishkath_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days — Firebase's own cap on session cookies

/**
 * Whether the session cookie carries the Secure flag.
 *
 * Secure follows the transport, not the build: a browser silently discards a
 * Secure cookie that arrived over plain HTTP, which locks the admin out of a
 * site served on http://. Defaults to on in production; set COOKIE_SECURE=false
 * on a deployment that has no TLS yet, and drop the override once HTTPS is on.
 */
export function cookieSecure(env: NodeJS.ProcessEnv = process.env): boolean {
  const override = env.COOKIE_SECURE;
  if (override !== undefined && override !== "") {
    return override !== "false" && override !== "0";
  }
  return env.NODE_ENV === "production";
}

/** True when the caller holds a valid, unexpired admin session. */
export async function isAdmin(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;

  try {
    await adminAuth.verifySessionCookie(raw, true);
    return true;
  } catch {
    return false;
  }
}

/** Exchanges a client-verified Firebase ID token for a session cookie. */
export async function createSessionFromIdToken(idToken: string): Promise<void> {
  const expiresIn = MAX_AGE_SECONDS * 1000;
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

  (await cookies()).set(COOKIE, sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Guard for every write. Throws rather than returning, so a missed call fails loudly. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new NotAdminError();
  }
}

export class NotAdminError extends Error {
  constructor() {
    super("Only the admin can make changes. Sign in at /admin.");
    this.name = "NotAdminError";
  }
}
```

- [ ] **Step 2: Update the test file**

`lib/auth.test.ts` only ever tested `cookieSecure`, which is unchanged — no edits needed. Run it to confirm:

Run: `npx vitest run lib/auth.test.ts`
Expected: 4 tests pass, unchanged.

- [ ] **Step 3: Run the full check**

Run: `npx tsc --noEmit && npm test && npx eslint .`
Expected: all clean. (`app/admin/actions.ts` will fail to compile until Task 6 — if this task is executed standalone, that's expected; note it and continue to Task 6 before treating this as a blocker.)

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts
git commit -m "Rewrite lib/auth.ts around Firebase session cookies"
```

---

### Task 6: Rewrite `app/admin/actions.ts`

**Files:**
- Modify: `app/admin/actions.ts`

**Interfaces:**
- Consumes: `createSessionFromIdToken`, `endSession` from Task 5.
- Produces: `login(idToken: string): Promise<LoginResult>` (signature changed — was `login(formData: FormData)`), `logout(): Promise<LoginResult>` (unchanged) — consumed by `components/AdminPanel.tsx` in Task 7.

- [ ] **Step 1: Rewrite the file**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createSessionFromIdToken, endSession } from "@/lib/auth";

export type LoginResult = { ok: true } | { ok: false; error: string };

/**
 * The password itself is verified by Firebase Auth on the client (see
 * components/AdminPanel.tsx) — this only ever sees an already-verified ID
 * token, which it exchanges for a session cookie. Firebase Auth has its own
 * built-in rate limiting on repeated failed sign-ins.
 */
export async function login(idToken: string): Promise<LoginResult> {
  try {
    await createSessionFromIdToken(idToken);
  } catch {
    return { ok: false, error: "Could not start a session. Try signing in again." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function logout(): Promise<LoginResult> {
  await endSession();
  revalidatePath("/", "layout");
  return { ok: true };
}
```

- [ ] **Step 2: Run the full check**

Run: `npx tsc --noEmit && npm test && npx eslint .`
Expected: all clean except `components/AdminPanel.tsx`, which still calls the old `login(formData)` shape until Task 7 — note and continue.

- [ ] **Step 3: Commit**

```bash
git add app/admin/actions.ts
git commit -m "Change login() to take a Firebase ID token instead of a password"
```

---

### Task 7: Client-side sign-in in `components/AdminPanel.tsx`

**Files:**
- Modify: `components/AdminPanel.tsx`

**Interfaces:**
- Consumes: `clientAuth` from Task 3, `login`/`logout` from Task 6.
- Produces: no change to the component's own props (`{ signedIn: boolean }`) — `app/admin/page.tsx` is untouched.

- [ ] **Step 1: Change the sign-in handler**

Replace the top of the file and the `submit` function:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, useTransition } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { login, logout } from "@/app/admin/actions";
import { clientAuth } from "@/lib/firebase-client";
import { useToast } from "@/components/Toast";

const ADMIN_EMAIL = "admin@friendlyfund.internal";

/** Sign in as the admin, or sign out again. */
export function AdminPanel({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!password) return setError("Enter the admin password.");

    startTransition(async () => {
      try {
        const credential = await signInWithEmailAndPassword(
          clientAuth,
          ADMIN_EMAIL,
          password
        );
        const idToken = await credential.user.getIdToken();

        const result = await login(idToken);
        if (!result.ok) {
          setError(result.error);
          setPassword("");
          return;
        }

        notify("Signed in as admin");
        router.push("/");
      } catch {
        setError("That password is not right.");
        setPassword("");
      }
    });
  }
```

Leave `signOut` and everything below it (the JSX) exactly as it is — `logout()`'s signature didn't change.

- [ ] **Step 2: Manual verification**

Run: `npm run dev`, then in a browser:
1. Go to `/admin`, enter `pQpFRL6XP0ejNPSX`, submit.
Expected: "Signed in as admin" toast, redirected to `/`, admin controls (nav "+" button, logout icon in header) visible.
2. Click the logout icon in the header.
Expected: "Signed out" toast, admin controls disappear.
3. Go to `/admin` again, enter a wrong password.
Expected: "That password is not right." shown, no crash.

- [ ] **Step 3: Run the full check**

Run: `npx tsc --noEmit && npm test && npx eslint .`
Expected: all clean.

- [ ] **Step 4: Commit**

```bash
git add components/AdminPanel.tsx
git commit -m "Sign in through Firebase Auth from the client, same password-only UI"
```

---

### Task 8: `lib/push-subscriptions.ts` — Firestore access for push subscriptions

**Files:**
- Create: `lib/push-subscriptions.ts`

**Interfaces:**
- Consumes: `adminDb` from Task 2.
- Produces: `type PushSubscriptionRecord = { id: string; endpoint: string; p256dh: string; auth: string }`, `getPushSubscriptions(): Promise<PushSubscriptionRecord[]>`, `upsertPushSubscription(input: { endpoint: string; p256dh: string; auth: string; userAgent: string | null }): Promise<void>`, `deletePushSubscriptionByEndpoint(endpoint: string): Promise<void>`, `dropPushSubscription(id: string): Promise<void>`, `bumpPushSubscriptionFailure(id: string): Promise<void>` — consumed by `lib/push.ts` (Task 9) and the two API routes (Task 10).

- [ ] **Step 1: Write the file**

```typescript
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

const COLLECTION = "pushSubscriptions";

export type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function getPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const snap = await adminDb.collection(COLLECTION).get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    endpoint: doc.get("endpoint") as string,
    p256dh: doc.get("p256dh") as string,
    auth: doc.get("auth") as string,
  }));
}

/** Re-subscribing the same device updates rather than duplicates. */
export async function upsertPushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}): Promise<void> {
  const existing = await adminDb
    .collection(COLLECTION)
    .where("endpoint", "==", input.endpoint)
    .limit(1)
    .get();

  const data = {
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    userAgent: input.userAgent,
    failureCount: 0,
  };

  if (existing.empty) {
    await adminDb.collection(COLLECTION).add({ ...data, createdAt: FieldValue.serverTimestamp() });
  } else {
    await existing.docs[0].ref.update(data);
  }
}

export async function deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
  const existing = await adminDb
    .collection(COLLECTION)
    .where("endpoint", "==", endpoint)
    .limit(1)
    .get();

  if (!existing.empty) await existing.docs[0].ref.delete();
}

export async function dropPushSubscription(id: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(id).delete();
}

export async function bumpPushSubscriptionFailure(id: string): Promise<void> {
  await adminDb
    .collection(COLLECTION)
    .doc(id)
    .update({ failureCount: FieldValue.increment(1) });
}
```

- [ ] **Step 2: Run the full check**

Run: `npx tsc --noEmit && npx eslint .`
Expected: clean (nothing calls these functions yet — that's Tasks 9 and 10).

- [ ] **Step 3: Commit**

```bash
git add lib/push-subscriptions.ts
git commit -m "Add Firestore access layer for push subscriptions"
```

---

### Task 9: Rewrite `lib/push.ts`

**Files:**
- Modify: `lib/push.ts`

**Interfaces:**
- Consumes: `getPushSubscriptions`, `dropPushSubscription`, `bumpPushSubscriptionFailure` from Task 8.
- Produces: `sendPush(event: PushEvent): Promise<void>` (unchanged signature) — consumed by `app/actions.ts` (Task 12).

- [ ] **Step 1: Rewrite the file**

```typescript
import webpush from "web-push";
import {
  bumpPushSubscriptionFailure,
  dropPushSubscription,
  getPushSubscriptions,
} from "@/lib/push-subscriptions";
import {
  buildPushPayload,
  shouldDropSubscription,
  type PushEvent,
} from "@/lib/push-messages";

/**
 * Delivery for the notification payloads built in lib/push-messages.ts.
 *
 * Nothing here is allowed to throw: a push failure must never turn a recorded
 * deposit into an error on screen.
 */

let configured = false;

function configure(): boolean {
  if (configured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

  // Without keys the app still works; it simply sends nothing.
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/** Fan a payload out to every subscribed device. Never throws. */
export async function sendPush(event: PushEvent): Promise<void> {
  try {
    if (!configure()) return;

    const subs = await getPushSubscriptions();
    if (subs.length === 0) return;

    const payload = JSON.stringify(buildPushPayload(event));

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode ?? 0;

          if (shouldDropSubscription(status)) {
            // The device is gone for good; stop carrying it.
            await dropPushSubscription(sub.id).catch(() => {});
          } else {
            await bumpPushSubscriptionFailure(sub.id).catch(() => {});
          }
        }
      })
    );
  } catch (err) {
    console.error("push send failed", err);
  }
}
```

- [ ] **Step 2: Run the full check**

Run: `npx tsc --noEmit && npm test && npx eslint .`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/push.ts
git commit -m "Point lib/push.ts at Firestore push subscriptions"
```

---

### Task 10: Rewrite the push API routes

**Files:**
- Modify: `app/api/push/subscribe/route.ts`
- Modify: `app/api/push/unsubscribe/route.ts`

**Interfaces:**
- Consumes: `upsertPushSubscription`, `deletePushSubscriptionByEndpoint` from Task 8.

- [ ] **Step 1: Rewrite `subscribe/route.ts`**

```typescript
import { z } from "zod";
import { upsertPushSubscription } from "@/lib/push-subscriptions";

/** Stores a device's push subscription. Anyone who taps Allow may subscribe. */

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ ok: false, error: "Bad subscription" }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;
  const userAgent = request.headers.get("user-agent")?.slice(0, 200) ?? null;

  await upsertPushSubscription({
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent,
  });

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Rewrite `unsubscribe/route.ts`**

```typescript
import { z } from "zod";
import { deletePushSubscriptionByEndpoint } from "@/lib/push-subscriptions";

/** Forgets a device. Deleting something already gone is not an error. */

const schema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ ok: false }, { status: 400 });
  }

  await deletePushSubscriptionByEndpoint(parsed.data.endpoint).catch(() => {});

  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Run the full check**

Run: `npx tsc --noEmit && npm test && npx eslint .`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/api/push/subscribe/route.ts app/api/push/unsubscribe/route.ts
git commit -m "Point push subscribe/unsubscribe routes at Firestore"
```

---

### Task 11: Rewrite `lib/queries.ts`

**Files:**
- Modify: `lib/queries.ts`

**Interfaces:**
- Consumes: `adminDb` from Task 2.
- Produces: `MONTHLY_AMOUNT`, `TxType`, `TxView`, `MemberView`, `getMembers(): Promise<MemberView[]>`, `getMember(id: string): Promise<{ member: MemberView; transactions: TxView[] } | null>`, `getRecentTransactions(limit?: number): Promise<TxView[]>`, `HomeSummary`, `getHomeSummary(): Promise<HomeSummary>`, `MonthPoint`, `getMonthlySeries(months?: number): Promise<MonthPoint[]>` — **all signatures identical to today**. Consumed by `app/page.tsx`, `app/members/page.tsx`, `app/members/[id]/page.tsx`, `app/stats/page.tsx` — none of which need to change.

- [ ] **Step 1: Write the file**

```typescript
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { balanceOf, splitTotals, type Movement } from "@/lib/money";
import { monthKey } from "@/lib/grouping";

/**
 * Read helpers for the screens. Firestore has no cross-collection joins and
 * no arbitrary GROUP BY, so each function fetches the raw collections and
 * groups in JS — the same pattern getHomeSummary/getMonthlySeries already
 * used even under Prisma. Fetching the whole `transactions` collection once
 * per request is fine at this app's scale (a handful of friends).
 */

export const MONTHLY_AMOUNT = 1000;

export type TxType = "DEPOSIT" | "WITHDRAWAL";

export type TxView = {
  id: string;
  type: TxType;
  amount: number;
  date: Date;
  note: string | null;
  memberId: string;
  memberName: string;
  memberPhotoUrl: string | null;
};

export type MemberView = {
  id: string;
  name: string;
  photoUrl: string | null;
  balance: number;
  deposits: number;
  withdrawals: number;
  transactionCount: number;
  lastActivity: Date | null;
  paidThisMonth: boolean;
};

type MemberDoc = { name: string; photoUrl: string | null };
type TransactionDoc = {
  memberId: string;
  type: TxType;
  amount: number;
  date: Timestamp;
  note: string | null;
};

async function allMembers(): Promise<{ id: string; data: MemberDoc }[]> {
  const snap = await adminDb.collection("members").get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as MemberDoc }));
}

/** Every transaction, newest first. Single-field orderBy needs no composite index. */
async function allTransactions(): Promise<{ id: string; data: TransactionDoc }[]> {
  const snap = await adminDb.collection("transactions").orderBy("date", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as TransactionDoc }));
}

/** Whether this month's deposits reach the fixed monthly contribution. */
function hasPaidThisMonth(transactions: { type: TxType; amount: number; date: Date }[]): boolean {
  const thisKey = monthKey(new Date());
  const depositedThisMonth = transactions
    .filter((t) => t.type === "DEPOSIT" && monthKey(t.date) === thisKey)
    .reduce((sum, t) => sum + t.amount, 0);
  return depositedThisMonth >= MONTHLY_AMOUNT;
}

function summarize(
  memberId: string,
  name: string,
  photoUrl: string | null,
  txs: { id: string; data: TransactionDoc }[]
): MemberView {
  const mine = txs
    .filter((t) => t.data.memberId === memberId)
    .map((t) => ({ ...t.data, date: t.data.date.toDate() }));

  const movements: Movement[] = mine.map((t) => ({ type: t.type, amount: t.amount }));
  const { deposits, withdrawals } = splitTotals(movements);

  return {
    id: memberId,
    name,
    photoUrl,
    balance: balanceOf(movements),
    deposits,
    withdrawals,
    transactionCount: mine.length,
    lastActivity: mine[0]?.date ?? null,
    paidThisMonth: hasPaidThisMonth(mine),
  };
}

export async function getMembers(): Promise<MemberView[]> {
  const [members, txs] = await Promise.all([allMembers(), allTransactions()]);
  return members.map((m) => summarize(m.id, m.data.name, m.data.photoUrl, txs));
}

export async function getMember(
  id: string
): Promise<{ member: MemberView; transactions: TxView[] } | null> {
  const [doc, txs] = await Promise.all([
    adminDb.collection("members").doc(id).get(),
    allTransactions(),
  ]);
  if (!doc.exists) return null;

  const data = doc.data() as MemberDoc;
  const member = summarize(id, data.name, data.photoUrl, txs);

  const transactions: TxView[] = txs
    .filter((t) => t.data.memberId === id)
    .map((t) => ({
      id: t.id,
      type: t.data.type,
      amount: t.data.amount,
      date: t.data.date.toDate(),
      note: t.data.note,
      memberId: id,
      memberName: data.name,
      memberPhotoUrl: data.photoUrl,
    }));

  return { member, transactions };
}

export async function getRecentTransactions(limit = 15): Promise<TxView[]> {
  const [txs, members] = await Promise.all([allTransactions(), allMembers()]);
  const byId = new Map(members.map((m) => [m.id, m.data]));

  return txs.slice(0, limit).map((t) => {
    const member = byId.get(t.data.memberId);
    return {
      id: t.id,
      type: t.data.type,
      amount: t.data.amount,
      date: t.data.date.toDate(),
      note: t.data.note,
      memberId: t.data.memberId,
      memberName: member?.name ?? "Unknown",
      memberPhotoUrl: member?.photoUrl ?? null,
    };
  });
}

export type HomeSummary = {
  totalPool: number;
  memberCount: number;
  thisMonthNet: number;
  lastMonthNet: number;
  paidCount: number;
};

export async function getHomeSummary(): Promise<HomeSummary> {
  const [members, txs] = await Promise.all([allMembers(), allTransactions()]);
  const all = txs.map((t) => ({ ...t.data, date: t.data.date.toDate() }));

  const movements: Movement[] = all.map((t) => ({ type: t.type, amount: t.amount }));

  const now = new Date();
  const thisKey = monthKey(now);
  const lastKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const netFor = (key: string) =>
    balanceOf(
      all
        .filter((t) => monthKey(t.date) === key)
        .map((t) => ({ type: t.type, amount: t.amount }))
    );

  const paidCount = members.filter((m) =>
    hasPaidThisMonth(all.filter((t) => t.memberId === m.id))
  ).length;

  return {
    totalPool: balanceOf(movements),
    memberCount: members.length,
    thisMonthNet: netFor(thisKey),
    lastMonthNet: netFor(lastKey),
    paidCount,
  };
}

export type MonthPoint = { key: string; date: Date; net: number; cumulative: number };

/** Net and running total for the last `months` calendar months. */
export async function getMonthlySeries(months = 6): Promise<MonthPoint[]> {
  const txs = await allTransactions();
  const all = txs.map((t) => ({ ...t.data, date: t.data.date.toDate() }));

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const netByMonth = new Map<string, number>();
  let carriedIn = 0;

  for (const t of all) {
    const signed = t.type === "DEPOSIT" ? t.amount : -t.amount;
    if (t.date < start) {
      carriedIn += signed;
      continue;
    }
    const key = monthKey(t.date);
    netByMonth.set(key, (netByMonth.get(key) ?? 0) + signed);
  }

  const points: MonthPoint[] = [];
  let running = carriedIn;

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const net = netByMonth.get(monthKey(date)) ?? 0;
    running += net;
    points.push({
      key: monthKey(date),
      date,
      net: Math.round(net * 100) / 100,
      cumulative: Math.round(running * 100) / 100,
    });
  }

  return points;
}
```

- [ ] **Step 2: Run the full check**

Run: `npx tsc --noEmit && npm test && npx eslint .`
Expected: clean. (The app itself won't show real data yet — Firestore is still empty until Task 13's migration runs — but it should render the empty states without errors. Verify by running `npm run dev` and loading `/`, `/members`, `/stats`.)

- [ ] **Step 3: Commit**

```bash
git add lib/queries.ts
git commit -m "Rewrite lib/queries.ts to read from Firestore"
```

---

### Task 12: Rewrite `app/actions.ts`

**Files:**
- Modify: `app/actions.ts`

**Interfaces:**
- Consumes: `adminDb` from Task 2, `sendPush` from Task 9 (unchanged), `isAdmin` from Task 5 (unchanged).
- Produces: `ActionResult`, `createMember`, `updateMember`, `deleteMember`, `createTransaction`, `deleteTransaction` — **all signatures identical to today**. Consumed by `components/EntrySheet.tsx`, `components/MemberSheet.tsx`, `components/MemberDetail.tsx`, `components/HomeActions.tsx` — none of which need to change.

- [ ] **Step 1: Rewrite the file**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { isAdmin } from "@/lib/auth";
import { deletePhoto, savePhoto, UploadError } from "@/lib/storage";
import { sendPush } from "@/lib/push";

/**
 * Every mutation returns the same shape so forms can render field errors
 * without throwing. `error` is a message meant for the user.
 */
export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; field?: string };

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(60, "Name is too long.");

const transactionSchema = z.object({
  memberId: z.string().min(1, "Pick a member."),
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  amount: z
    .number()
    .positive("Enter an amount greater than zero.")
    .max(99_999_999.99, "That amount is too large."),
  date: z.date(),
  note: z.string().trim().max(140, "Note is too long.").optional(),
});

function fail(error: string, field?: string): ActionResult {
  return { ok: false, error, field };
}

/**
 * Every write goes through here. Hiding buttons in the UI is not protection —
 * a server action is a public endpoint, so the check has to live on the server.
 */
async function denyIfNotAdmin(): Promise<ActionResult | null> {
  if (await isAdmin()) return null;
  return fail("Only the admin can make changes. Sign in at /admin.");
}

function refreshAll() {
  revalidatePath("/", "layout");
}

/** Parse a "YYYY-MM-DD" input as a plain calendar date, free of timezone drift. */
function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createMember(formData: FormData): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const parsedName = nameSchema.safeParse(formData.get("name"));
  if (!parsedName.success)
    return fail(parsedName.error.issues[0].message, "name");

  const photo = formData.get("photo");
  let photoUrl: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    try {
      photoUrl = await savePhoto(photo);
    } catch (err) {
      if (err instanceof UploadError) return fail(err.message, "photo");
      throw err;
    }
  }

  const ref = await adminDb.collection("members").add({
    name: parsedName.data,
    photoUrl,
    createdAt: FieldValue.serverTimestamp(),
  });

  await sendPush({ kind: "member-added", memberName: parsedName.data });

  refreshAll();
  return { ok: true, id: ref.id };
}

export async function updateMember(formData: FormData): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Member not found.");

  const docRef = adminDb.collection("members").doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return fail("Member not found.");

  const parsedName = nameSchema.safeParse(formData.get("name"));
  if (!parsedName.success)
    return fail(parsedName.error.issues[0].message, "name");

  const existingPhotoUrl = existing.get("photoUrl") as string | null;
  const photo = formData.get("photo");
  let photoUrl = existingPhotoUrl;

  if (photo instanceof File && photo.size > 0) {
    try {
      photoUrl = await savePhoto(photo);
      await deletePhoto(existingPhotoUrl);
    } catch (err) {
      if (err instanceof UploadError) return fail(err.message, "photo");
      throw err;
    }
  } else if (formData.get("removePhoto") === "1") {
    await deletePhoto(existingPhotoUrl);
    photoUrl = null;
  }

  await docRef.update({ name: parsedName.data, photoUrl });

  refreshAll();
  return { ok: true, id };
}

export async function deleteMember(id: string): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const docRef = adminDb.collection("members").doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return fail("Member not found.");

  const name = existing.get("name") as string;
  const photoUrl = existing.get("photoUrl") as string | null;

  // Firestore has no cascade delete — remove the member's transactions by hand.
  const theirTxs = await adminDb.collection("transactions").where("memberId", "==", id).get();
  const batch = adminDb.batch();
  theirTxs.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(docRef);
  await batch.commit();

  await deletePhoto(photoUrl);
  await sendPush({ kind: "member-deleted", memberName: name });

  refreshAll();
  return { ok: true };
}

export async function createTransaction(
  formData: FormData
): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const date = parseDateInput(String(formData.get("date") ?? ""));
  if (!date) return fail("Pick a valid date.", "date");

  const parsed = transactionSchema.safeParse({
    memberId: String(formData.get("memberId") ?? ""),
    type: formData.get("type"),
    amount: Number(formData.get("amount")),
    date,
    note: String(formData.get("note") ?? "") || undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(issue.message, String(issue.path[0] ?? ""));
  }

  const memberDoc = await adminDb.collection("members").doc(parsed.data.memberId).get();
  if (!memberDoc.exists) return fail("That member no longer exists.", "memberId");

  const ref = await adminDb.collection("transactions").add({
    memberId: parsed.data.memberId,
    type: parsed.data.type,
    amount: parsed.data.amount,
    date: Timestamp.fromDate(parsed.data.date),
    note: parsed.data.note ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });

  await sendPush({
    kind: "transaction",
    type: parsed.data.type,
    memberName: memberDoc.get("name") as string,
    amount: parsed.data.amount,
  });

  refreshAll();
  return { ok: true, id: ref.id };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const docRef = adminDb.collection("transactions").doc(id);
  const existing = await docRef.get();
  if (!existing.exists) return fail("Entry not found.");

  const memberDoc = await adminDb.collection("members").doc(existing.get("memberId") as string).get();

  await docRef.delete();

  await sendPush({
    kind: "transaction-deleted",
    memberName: (memberDoc.get("name") as string | undefined) ?? "Someone",
    amount: existing.get("amount") as number,
  });

  refreshAll();
  return { ok: true };
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`, sign in as admin, then:
1. Add a new member with a photo.
Expected: appears in `/members`, photo shows.
2. Add a deposit for that member.
Expected: shows on home page and their member page, "paid this month" reflects it.
3. Delete the transaction, then delete the member.
Expected: both disappear cleanly, no errors in the server log.

- [ ] **Step 3: Run the full check**

Run: `npx tsc --noEmit && npm test && npx eslint .`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/actions.ts
git commit -m "Rewrite app/actions.ts to write to Firestore"
```

---

### Task 13: Migrate existing data, then verify end-to-end

**Files:**
- Create: `prisma/migrate-to-firestore.ts`

**Interfaces:**
- Consumes: the existing Prisma client (`lib/db.ts`, untouched until Task 14) and `adminDb` from Task 2.

- [ ] **Step 1: Write the migration script**

```typescript
import "dotenv/config";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../lib/firebase-admin";
import { prisma } from "../lib/db";

async function main() {
  const members = await prisma.member.findMany();
  for (const m of members) {
    await adminDb.collection("members").doc(m.id).set({
      name: m.name,
      photoUrl: m.photoUrl,
      createdAt: Timestamp.fromDate(m.createdAt),
    });
  }
  console.log(`Migrated ${members.length} member(s).`);

  const txs = await prisma.transaction.findMany();
  for (const t of txs) {
    await adminDb.collection("transactions").doc(t.id).set({
      memberId: t.memberId,
      type: t.type,
      amount: Number(t.amount),
      date: Timestamp.fromDate(t.date),
      note: t.note,
      createdAt: Timestamp.fromDate(t.createdAt),
    });
  }
  console.log(`Migrated ${txs.length} transaction(s).`);

  const subs = await prisma.pushSubscription.findMany();
  for (const s of subs) {
    await adminDb.collection("pushSubscriptions").doc(s.id).set({
      endpoint: s.endpoint,
      p256dh: s.p256dh,
      auth: s.auth,
      userAgent: s.userAgent,
      createdAt: Timestamp.fromDate(s.createdAt),
      failureCount: s.failureCount,
    });
  }
  console.log(`Migrated ${subs.length} push subscription(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run it**

Run: `npx tsx prisma/migrate-to-firestore.ts`
Expected: prints counts matching what's in Postgres (1 member, 1 transaction, 0+ push subscriptions as of this plan being written).

- [ ] **Step 3: Verify in the app**

Run: `npm run dev`, load `/`.
Expected: the total, member count, and "Sha"'s transaction all show exactly as they did before the migration. Load `/members/<id>` for Sha and confirm their transaction history matches.

- [ ] **Step 4: Full regression pass**

Run through every page as both a signed-out visitor and signed-in admin: `/`, `/members`, `/members/<id>`, `/stats`, `/admin`. For admin: add a member, add a deposit, add a withdrawal, edit a member's name/photo, delete a transaction, delete a member, sign out.

- [ ] **Step 5: Run the full check**

Run: `npx tsc --noEmit && npm test && npx eslint .`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add prisma/migrate-to-firestore.ts
git commit -m "Add and run the Postgres-to-Firestore data migration script"
```

---

### Task 14: Remove Prisma entirely

**Files:**
- Delete: `lib/db.ts`, `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrate-to-firestore.ts`, `prisma.config.ts`, `app/generated/`
- Modify: `package.json`

**Interfaces:**
- None — this is pure removal. Nothing produced in earlier tasks depends on Prisma anymore (verified by Task 13's full regression pass).

- [ ] **Step 1: Delete the files**

```bash
rm -rf lib/db.ts prisma app/generated prisma.config.ts
```

- [ ] **Step 2: Remove the Prisma packages and scripts**

Edit `package.json`:
- Remove the `db:push`, `db:seed`, `db:studio` scripts.
- Remove `@prisma/adapter-pg`, `@prisma/client`, `pg` from `dependencies`.
- Remove `@types/pg`, `prisma` from `devDependencies`.
- Remove the top-level `"prisma": { "seed": "tsx prisma/seed.ts" }` block.

Then run: `npm install` (to update `package-lock.json` to match).

- [ ] **Step 3: Confirm nothing else references Prisma**

Run: `grep -rn "prisma\|@prisma" --include="*.ts" --include="*.tsx" app components lib scripts 2>/dev/null`
Expected: no output. If anything shows up, it's a file this plan missed — fix it before continuing.

- [ ] **Step 4: Full regression pass**

Run: `rm -rf .next && npm run dev`, then repeat Task 13 Step 4's full page/action walkthrough. The app must work identically with Prisma completely gone.

- [ ] **Step 5: Run the full check**

Run: `npx tsc --noEmit && npm test && npx eslint .`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Remove Prisma entirely — Firestore is now the only data store"
```
