import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; a stray lockfile in a parent folder confuses Turbopack.
  turbopack: { root: path.resolve(".") },

  // firebase-admin's auth module pulls in jwks-rsa, which requires jose's
  // ESM build via require() — bundling that breaks at runtime on Vercel.
  // Externalizing firebase-admin alone doesn't stop Turbopack from still
  // bundling its transitive deps, so jwks-rsa and jose need to be named too.
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose"],

  experimental: {
    // Photos go up through a server action, which caps bodies at 1 MB by
    // default — smaller than the 5 MB the upload itself allows, so a photo
    // straight off a phone would be rejected before it reached savePhoto.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
