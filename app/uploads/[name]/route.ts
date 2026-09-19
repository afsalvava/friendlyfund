import { contentTypeFor, readPhoto } from "@/lib/storage";

/**
 * Serves member photos from the upload directory.
 *
 * Next.js only serves files that were in `public/` at build time, so uploads
 * written while the app is running need a route of their own. Keeping the URL
 * shape `/uploads/<name>` means the photoUrl values already in the database
 * keep working unchanged.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const file = await readPhoto(name);

  if (!file) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": contentTypeFor(name),
      "Content-Length": String(file.byteLength),
      // The filename is a fresh UUID on every upload, so the bytes never change.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
