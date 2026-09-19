import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root; a stray lockfile in a parent folder confuses Turbopack.
  turbopack: { root: path.resolve(".") },

  experimental: {
    // Photos go up through a server action, which caps bodies at 1 MB by
    // default — smaller than the 5 MB the upload itself allows, so a photo
    // straight off a phone would be rejected before it reached savePhoto.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
