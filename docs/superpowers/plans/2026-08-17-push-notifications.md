# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify every opted-in device when a member is added, an entry is recorded, or either is deleted.

**Architecture:** Web Push with a VAPID keypair. A service worker in `public/sw.js` displays notifications; subscriptions live in a `PushSubscription` table; the four mutations in `app/actions.ts` fire events that `lib/push.ts` fans out to every device.

**Tech Stack:** Next.js 16, Prisma 7 + Postgres, `web-push`, vitest.

**Spec:** `docs/superpowers/specs/2026-08-17-push-notifications-design.md`

## Global Constraints

- A push failure must never fail the database write it followed.
- `VAPID_PRIVATE_KEY` never reaches the browser. Only `NEXT_PUBLIC_VAPID_PUBLIC_KEY` does.
- Push requires HTTPS; test against `https://fundcollection.mishkath.com`, not the bare IP.
- iOS needs the app added to the Home Screen, iOS 16.4+.
- Amounts use `formatRupees` from `lib/money.ts`, matching the rest of the app.
- Deploy is rsync + build on the droplet, `NODE_OPTIONS=--max-old-space-size=1536`.

---

### Task 1: Message builders

**Files:**
- Create: `lib/push-messages.ts`
- Test: `lib/push-messages.test.ts`

**Interfaces:**
- Produces: `type PushEvent`, `type PushPayload = { title: string; body: string; url: string }`, `buildPushPayload(event: PushEvent): PushPayload`, `shouldDropSubscription(status: number): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildPushPayload, shouldDropSubscription } from "./push-messages";

describe("buildPushPayload", () => {
  it("describes a deposit with member, amount and fund", () => {
    expect(
      buildPushPayload({
        kind: "transaction",
        type: "DEPOSIT",
        memberName: "Naseeh",
        amount: 500,
        fundName: "Trip Fund",
        fundSlug: "trip",
      })
    ).toEqual({
      title: "Trip Fund",
      body: "Naseeh deposited ₹500",
      url: "/",
    });
  });

  it("words a withdrawal differently and links to the fund", () => {
    expect(
      buildPushPayload({
        kind: "transaction",
        type: "WITHDRAWAL",
        memberName: "Siraj",
        amount: 2000,
        fundName: "Emergency Fund",
        fundSlug: "emergency",
      })
    ).toEqual({
      title: "Emergency Fund",
      body: "Siraj withdrew ₹2,000",
      url: "/?fund=emergency",
    });
  });

  it("announces a new member", () => {
    expect(buildPushPayload({ kind: "member-added", memberName: "Fasil" })).toEqual({
      title: "Mishkath",
      body: "Fasil was added as a member",
      url: "/members",
    });
  });

  it("announces removals", () => {
    expect(buildPushPayload({ kind: "member-deleted", memberName: "Fasil" })).toEqual({
      title: "Mishkath",
      body: "Fasil was removed",
      url: "/members",
    });

    expect(
      buildPushPayload({
        kind: "transaction-deleted",
        memberName: "Siraj",
        amount: 2000,
        fundName: "Trip Fund",
        fundSlug: "trip",
      })
    ).toEqual({
      title: "Trip Fund",
      body: "An entry of ₹2,000 for Siraj was deleted",
      url: "/",
    });
  });
});

describe("shouldDropSubscription", () => {
  it("drops endpoints the push service says are gone", () => {
    expect(shouldDropSubscription(404)).toBe(true);
    expect(shouldDropSubscription(410)).toBe(true);
  });

  it("keeps everything else, which may be transient", () => {
    expect(shouldDropSubscription(429)).toBe(false);
    expect(shouldDropSubscription(500)).toBe(false);
    expect(shouldDropSubscription(201)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/push-messages.test.ts` — fails, module missing.

- [ ] **Step 3: Implement**

```ts
import { formatRupees } from "@/lib/money";
import { DEFAULT_FUND_SLUG, type FundSlug } from "@/lib/funds";

export type PushPayload = { title: string; body: string; url: string };

export type PushEvent =
  | { kind: "member-added"; memberName: string }
  | { kind: "member-deleted"; memberName: string }
  | {
      kind: "transaction";
      type: "DEPOSIT" | "WITHDRAWAL";
      memberName: string;
      amount: number;
      fundName: string;
      fundSlug: FundSlug;
    }
  | {
      kind: "transaction-deleted";
      memberName: string;
      amount: number;
      fundName: string;
      fundSlug: FundSlug;
    };

function fundUrl(slug: FundSlug, path = "/"): string {
  return slug === DEFAULT_FUND_SLUG ? path : `${path}?fund=${slug}`;
}

export function buildPushPayload(event: PushEvent): PushPayload {
  switch (event.kind) {
    case "member-added":
      return {
        title: "Mishkath",
        body: `${event.memberName} was added as a member`,
        url: "/members",
      };
    case "member-deleted":
      return {
        title: "Mishkath",
        body: `${event.memberName} was removed`,
        url: "/members",
      };
    case "transaction":
      return {
        title: event.fundName,
        body: `${event.memberName} ${
          event.type === "DEPOSIT" ? "deposited" : "withdrew"
        } ${formatRupees(event.amount)}`,
        url: fundUrl(event.fundSlug),
      };
    case "transaction-deleted":
      return {
        title: event.fundName,
        body: `An entry of ${formatRupees(event.amount)} for ${event.memberName} was deleted`,
        url: fundUrl(event.fundSlug),
      };
  }
}

/** 404 and 410 mean the device is gone for good; anything else may be transient. */
export function shouldDropSubscription(status: number): boolean {
  return status === 404 || status === 410;
}
```

- [ ] **Step 4: Tests pass**

Run: `npx vitest run` — all green.

- [ ] **Step 5: Commit**

```bash
git add lib/push-messages.ts lib/push-messages.test.ts
git commit -m "feat: build push notification messages"
```

---

### Task 2: Schema and dependency

**Files:**
- Modify: `prisma/schema.prisma`, `package.json`

- [ ] **Step 1: Install web-push**

```bash
npm install web-push
npm install --save-dev @types/web-push
```

- [ ] **Step 2: Add the model**

```prisma
model PushSubscription {
  id           String   @id @default(cuid())
  endpoint     String   @unique
  p256dh       String
  auth         String
  userAgent    String?
  createdAt    DateTime @default(now())
  failureCount Int      @default(0)
}
```

- [ ] **Step 3: Generate the client and push**

Run: `npx prisma generate && npx prisma db push`
Expected: succeeds. The table is new, so there is no backfill problem.

- [ ] **Step 4: Generate the VAPID keypair**

Run: `npx web-push generate-vapid-keys`

Add to `.env` (and later to the server's `.env`):

```
VAPID_PUBLIC_KEY=<public>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same public key>
VAPID_PRIVATE_KEY=<private>
VAPID_SUBJECT=mailto:owletoraz@gmail.com
```

Generate ONCE. Rotating invalidates every subscription.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma package.json package-lock.json
git commit -m "feat: add push subscription storage"
```

---

### Task 3: Sending

**Files:**
- Create: `lib/push.ts`

**Interfaces:**
- Consumes: `buildPushPayload`, `shouldDropSubscription` (Task 1)
- Produces: `sendPush(event: PushEvent): Promise<void>` — never throws

- [ ] **Step 1: Implement**

```ts
import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db";
import { buildPushPayload, shouldDropSubscription, type PushEvent } from "@/lib/push-messages";

let configured = false;

function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Fan a payload out to every subscribed device. Never throws: a push failure
 * must not turn a recorded deposit into an error.
 */
export async function sendPush(event: PushEvent): Promise<void> {
  try {
    if (!configure()) return;

    const subs = await prisma.pushSubscription.findMany();
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
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            await prisma.pushSubscription
              .update({ where: { id: sub.id }, data: { failureCount: { increment: 1 } } })
              .catch(() => {});
          }
        }
      })
    );
  } catch (err) {
    console.error("push send failed", err);
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` — clean.

- [ ] **Step 3: Commit**

```bash
git add lib/push.ts
git commit -m "feat: fan push notifications out to subscribed devices"
```

---

### Task 4: Subscribe and unsubscribe routes

**Files:**
- Create: `app/api/push/subscribe/route.ts`, `app/api/push/unsubscribe/route.ts`

- [ ] **Step 1: Subscribe**

```ts
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Bad subscription" }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;
  const userAgent = request.headers.get("user-agent")?.slice(0, 200) ?? null;

  // Re-subscribing the same device updates rather than duplicates.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, userAgent, failureCount: 0 },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Unsubscribe**

```ts
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false }, { status: 400 });
  }

  await prisma.pushSubscription
    .delete({ where: { endpoint: parsed.data.endpoint } })
    .catch(() => {});

  return Response.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/push
git commit -m "feat: add push subscribe and unsubscribe endpoints"
```

---

### Task 5: Service worker and icons

**Files:**
- Create: `public/sw.js`, `public/icon-192.png`, `public/icon-512.png`
- Modify: `app/manifest.ts`

- [ ] **Step 1: Write the service worker**

```js
// public/sw.js
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Mishkath", body: event.data.text(), url: "/" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Mishkath", {
      body: payload.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url ?? "/" },
      tag: "mishkath-activity",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
```

- [ ] **Step 2: Add PNG icons**

Generate 192px and 512px PNGs from `public/icon.svg` and add both to the manifest's `icons` array alongside the SVG, each with `type: "image/png"` and `purpose: "any"`.

- [ ] **Step 3: Commit**

```bash
git add public/sw.js public/icon-192.png public/icon-512.png app/manifest.ts
git commit -m "feat: add service worker and PNG icons"
```

---

### Task 6: The toggle

**Files:**
- Create: `components/PushToggle.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Build the toggle**

It must handle four states — unsupported, blocked, off, on — and register the
service worker before subscribing. The permission prompt only opens from a real
tap, so subscription happens in the click handler, never on mount. On iOS,
detect a non-installed browser via `matchMedia("(display-mode: standalone)")`
and explain that the app must be added to the Home Screen first.

Subscribing converts the base64url VAPID public key to a `Uint8Array`, calls
`registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`,
and POSTs the result to `/api/push/subscribe`.

- [ ] **Step 2: Mount it on the home screen**

Add `<PushToggle />` to `app/page.tsx`, beside the fund toggle.

- [ ] **Step 3: Verify locally**

Run `npm run dev`, open in Chrome, tap the bell, accept the prompt. Expected: a
row appears in `PushSubscription`.

- [ ] **Step 4: Commit**

```bash
git add components/PushToggle.tsx app/page.tsx
git commit -m "feat: let a device subscribe to notifications"
```

---

### Task 7: Fire events from the mutations

**Files:**
- Modify: `app/actions.ts`

- [ ] **Step 1: Hook the four mutations**

After each successful write, and before `refreshAll()`, call `sendPush(...)`
with the matching event. `createTransaction` and `deleteTransaction` need the
member name and fund name, so widen their existing lookups to select them.

`deleteMember` must capture the name before the row is deleted.

- [ ] **Step 2: Typecheck and test**

Run: `npx tsc --noEmit && npm test` — clean, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/actions.ts
git commit -m "feat: notify devices when members or entries change"
```

---

### Task 8: Deploy and verify on a real phone

- [ ] **Step 1: Build locally**

Run: `npm test && npx tsc --noEmit && npm run build`

- [ ] **Step 2: Add the VAPID keys to the server**

Append the four variables to `/opt/mishkath-fund/app/.env` and add
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` to the systemd unit, since it is inlined at build
time and must be present when the build runs.

- [ ] **Step 3: Sync, migrate, build, restart**

```bash
rsync -az -e "ssh -i $HOME/mishkath-keygen" \
  --exclude node_modules --exclude .next --exclude .git --exclude app/generated \
  --exclude .env --exclude tsconfig.tsbuildinfo --exclude public/uploads --exclude var \
  ./ root@168.144.18.108:/opt/mishkath-fund/app/
ssh -i ~/mishkath-keygen root@168.144.18.108 'chown -R mishkath:mishkath /opt/mishkath-fund && \
  cd /opt/mishkath-fund/app && sudo -u mishkath npm install --no-audit --no-fund && \
  sudo -u mishkath npx prisma generate && sudo -u mishkath npx prisma db push && \
  sudo -u mishkath env NODE_OPTIONS=--max-old-space-size=1536 npm run build && \
  systemctl restart mishkath-fund'
```

- [ ] **Step 4: Verify the service worker is served**

```bash
curl -s -o /dev/null -w "sw %{http_code} %{content_type}\n" https://fundcollection.mishkath.com/sw.js
```
Expected: `200` and a JavaScript content type.

- [ ] **Step 5: Subscribe a real device and send a test**

On the phone: open `https://fundcollection.mishkath.com`, add to Home Screen (iOS),
open it from the Home Screen, tap the bell, accept. Confirm a row lands in
`PushSubscription`. Then record a ₹1 deposit from another device and confirm the
notification arrives with the right wording.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: push notifications for members and entries"
```

---

## Self-Review

**Spec coverage:** message builders (Task 1), schema and keys (Task 2), sending and pruning (Task 3), subscribe/unsubscribe (Task 4), service worker and PNG icons (Task 5), opt-in UI including the iOS case (Task 6), event wiring (Task 7), deploy and real-device verification (Task 8).

**Type consistency:** `PushEvent` and `PushPayload` are defined in Task 1 and consumed unchanged in Tasks 3 and 7. `shouldDropSubscription` is used only in Task 3. The subscribe route's request shape matches what `pushManager.subscribe()` returns via `toJSON()`.

**Known risk:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is inlined at build time, so it must exist on the server *before* the build step, not just at runtime. Task 8 Step 2 orders it correctly.
