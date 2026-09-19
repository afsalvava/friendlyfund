import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Photo storage behind a small interface. Swapping to object storage later only
 * touches this file.
 *
 * Uploads deliberately do NOT live in `public/`. Next.js only serves the files
 * that were in `public/` when the app was built, so anything written there at
 * runtime is invisible in production — it 404s, and next/image then reports
 * "received null". They are written outside the app instead and served by
 * `app/uploads/[name]/route.ts`, which also keeps them safe from a deploy that
 * syncs over the app directory.
 */

const UPLOAD_DIR =
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "var", "uploads");

const PUBLIC_PREFIX = "/uploads/";

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** Exactly the shape savePhoto generates: a UUID plus an allowed extension. */
const SAFE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export class UploadError extends Error {}

export function uploadDir(): string {
  return UPLOAD_DIR;
}

/** Guards the uploads route: the name comes straight from the URL. */
export function isSafeUploadName(name: string): boolean {
  return SAFE_NAME.test(name);
}

export function contentTypeFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/** Persist an uploaded photo and return the public URL to store on the member. */
export async function savePhoto(file: File): Promise<string> {
  const ext = ALLOWED.get(file.type);
  if (!ext) throw new UploadError("Photo must be a JPG, PNG, WebP or GIF.");
  if (file.size > MAX_PHOTO_BYTES)
    throw new UploadError("Photo must be smaller than 5 MB.");

  await mkdir(UPLOAD_DIR, { recursive: true });

  const name = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, name), bytes);

  return `${PUBLIC_PREFIX}${name}`;
}

/** Read a stored photo, or null if the name is unsafe or the file is gone. */
export async function readPhoto(name: string): Promise<Buffer | null> {
  if (!isSafeUploadName(name)) return null;
  try {
    return await readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}

/** Best-effort cleanup of a replaced or deleted photo. Never throws. */
export async function deletePhoto(url: string | null | undefined) {
  if (!url?.startsWith(PUBLIC_PREFIX)) return;

  const name = path.basename(url);
  if (!isSafeUploadName(name)) return;

  try {
    await unlink(path.join(UPLOAD_DIR, name));
  } catch {
    // The file is already gone, which is the outcome we wanted anyway.
  }
}
