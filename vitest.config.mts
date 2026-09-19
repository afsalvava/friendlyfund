import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

// Mirrors tsconfig.json's "@/*": ["./*"] — needed now that lib/auth.ts
// imports lib/firebase-admin.ts via the "@/" alias. setupFiles loads .env
// the same way the project's standalone scripts already do, since Firebase
// Admin reads GOOGLE_APPLICATION_CREDENTIALS at import time.
export default defineConfig({
  resolve: {
    alias: {
      "@": root,
    },
  },
  test: {
    setupFiles: ["dotenv/config"],
  },
});
