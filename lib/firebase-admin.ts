import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * A single Firebase Admin app per process. Next.js hot-reloads modules in
 * dev, so re-running initializeApp() on every reload would throw — reuse
 * the existing app if one is already registered.
 */
function credentialsPath(): string {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is not set. Add it to .env."
    );
  }
  return path;
}

const app = getApps()[0] ?? initializeApp({ credential: cert(credentialsPath()) });

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
