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
