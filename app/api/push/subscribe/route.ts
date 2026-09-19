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
