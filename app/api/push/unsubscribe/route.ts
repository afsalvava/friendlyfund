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
