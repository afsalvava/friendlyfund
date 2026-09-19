import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * A single Firebase Admin app per process. Next.js hot-reloads modules in
 * dev, so re-running initializeApp() on every reload would throw — reuse
 * the existing app if one is already registered.
 *
 * Serverless hosts (Vercel and similar) have no local file to point
 * GOOGLE_APPLICATION_CREDENTIALS at, so the whole service account JSON can
 * be supplied as one env var instead — FIREBASE_SERVICE_ACCOUNT_KEY. Local
 * dev keeps using the file path, which is easier to work with day to day.
 */
function credential() {
  const inlineKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (inlineKey) {
    return cert(JSON.parse(inlineKey) as ServiceAccount);
  }

  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) {
    throw new Error(
      "Neither FIREBASE_SERVICE_ACCOUNT_KEY nor GOOGLE_APPLICATION_CREDENTIALS is set. Add one to .env."
    );
  }
  return cert(path);
}

const app = getApps()[0] ?? initializeApp({ credential: credential() });

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
