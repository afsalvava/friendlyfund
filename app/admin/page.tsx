import Link from "next/link";
import { AdminPanel } from "@/components/AdminPanel";
import { Screen } from "@/components/Motion";
import { GlassCard } from "@/components/ui";
import { isAdmin } from "@/lib/auth";

export const metadata = { title: "Admin · FriendlyFund" };

export default async function AdminPage() {
  const admin = await isAdmin();

  return (
    <Screen>
      <header className="mb-5">
        <h1 className="font-wordmark text-[1.9rem] leading-none font-extrabold tracking-tight text-ink">
          Admin
        </h1>
        <p className="mt-1.5 text-sm font-medium text-ink-soft">
          {admin
            ? "You can add and edit members and entries."
            : "Sign in to add or edit. Everyone else can view."}
        </p>
      </header>

      <GlassCard className="p-6">
        <AdminPanel signedIn={admin} />
      </GlassCard>

      <p className="mt-5 text-center text-sm font-semibold text-ink-faint">
        <Link href="/">Back to the fund</Link>
      </p>
    </Screen>
  );
}
