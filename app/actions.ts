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
