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
