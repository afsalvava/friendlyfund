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
