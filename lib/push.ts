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
