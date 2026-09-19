# Push notifications to installed devices

**Date:** 2026-08-17
**Status:** Approved, ready for implementation

## Goal

When money moves or the roster changes, every device that has opted in gets a
notification — with the app closed. Delivery uses the Web Push standard, so
there is no third-party service and no cost.

## Decisions

| Question | Decision |
|---|---|
| Who may subscribe | Anyone who opens the app and taps Allow. No sign-in required. |
| Notification content | Full detail, including names and amounts. |
| Events | Member added, deposit, withdrawal, member or entry deleted. |
| Delivery | Web Push with a VAPID keypair, sent inline from the server action. |
| Opt-in | A bell toggle on the home screen. Browsers require a user gesture. |

The subscriber and content decisions were made with the exposure stated: the app
is publicly readable, so anyone who finds the URL can subscribe and will see
names and amounts on a lock screen. Recorded here so the trade-off stays visible
if it is revisited.

## Data model

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

`endpoint` is the browser's push URL and identifies a device; it is unique, so
re-subscribing the same device updates rather than duplicates. Nothing here ties
a subscription to a member — the audience is "every opted-in device".

## Keys

A VAPID keypair, generated once with `web-push generate-vapid-keys`:

- `VAPID_PUBLIC_KEY` — also exposed to the browser as
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, which is safe and required for subscribing
- `VAPID_PRIVATE_KEY` — server only, never sent to the client
- `VAPID_SUBJECT` — a `mailto:` URL identifying the sender

Rotating the keypair invalidates every existing subscription, so it is generated
once and left alone.

## Components

**`public/sw.js`** — the service worker, the prerequisite the app currently
lacks. Two handlers: `push` shows the notification from the JSON payload;
`notificationclick` focuses an open tab or opens the app at the URL carried in
the payload. It lives in `public/` because it is committed at build time, unlike
uploads.

**`lib/push-messages.ts`** — pure builders turning an event into `{ title, body,
url }`. No I/O, so it is unit-tested directly. Deposits and withdrawals get
distinct wording; amounts use the existing `formatRupees`.

**`lib/push.ts`** — `sendToAll(payload)`. Loads every subscription, sends
concurrently, and prunes dead ones. Kept apart from the message builders so the
tested logic stays free of network code.

**`app/api/push/subscribe/route.ts`** — upserts a subscription by endpoint. A
matching `unsubscribe` route deletes it.

**`components/PushToggle.tsx`** — a bell on the home screen with four states:
unsupported, blocked, off, on. On iOS it detects a browser tab rather than an
installed app and explains that the app must be added to the Home Screen first.

**`app/actions.ts`** — the four mutations fire their event after the database
write succeeds.

## Behaviour

**A failed push must never fail a save.** Sends are wrapped so an unreachable
push service cannot turn a recorded deposit into an error. Failures are logged
and nothing surfaces in the UI.

**Dead subscriptions self-clean.** A `404` or `410` from the push service means
the device is gone for good; that subscription is deleted. Other errors
increment `failureCount` and are left alone, since they may be transient.

**Sends are inline, not queued.** With a household's worth of devices this costs
a few hundred milliseconds. A queue would be premature.

## iOS

Safari supports Web Push only for apps added to the Home Screen, on iOS 16.4 or
later. A normal Safari tab cannot subscribe. The toggle detects this via
`display-mode: standalone` and says so, rather than failing silently. Android
and desktop Chrome subscribe from the browser directly.

The manifest currently ships only `icon.svg`. Notification icons and badges need
PNG, so `icon-192.png` and `icon-512.png` are added and referenced.

## Testing

Unit tests, in the existing vitest setup:

- each of the four events produces the expected title, body, and URL
- deposits and withdrawals read differently
- amounts are formatted in rupees, matching the rest of the app
- the prune decision: `404` and `410` delete, other statuses do not

Actual delivery is verified after deploy by sending a real push to a subscribed
phone, which needs a physical device and cannot be unit-tested.

## Risks

- **Permission is one-shot per device.** If someone taps Block, the browser will
  not ask again; they must clear it in site settings. The toggle explains this
  rather than retrying.
- **The endpoint is a bearer capability.** Anyone holding it could send that
  device a notification, but they would also need the private VAPID key, which
  stays on the server.
- **Open subscription means unknown recipients.** There is no list of who is
  subscribed beyond a user-agent string.
