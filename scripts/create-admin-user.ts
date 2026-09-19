import "dotenv/config";
import { adminAuth } from "../lib/firebase-admin";

const EMAIL = "admin@friendlyfund.internal";
const PASSWORD = "ahlamshan";

async function main() {
  try {
    const existing = await adminAuth.getUserByEmail(EMAIL);
    console.log(`Admin user already exists: ${existing.uid}`);
    return;
  } catch (err) {
    if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
  }

  const user = await adminAuth.createUser({ email: EMAIL, password: PASSWORD });
  console.log(`Created admin user: ${user.uid}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
