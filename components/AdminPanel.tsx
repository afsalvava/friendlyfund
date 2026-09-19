"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, useTransition } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { login, logout } from "@/app/admin/actions";
import { clientAuth } from "@/lib/firebase-client";
import { useToast } from "@/components/Toast";

const ADMIN_EMAIL = "admin@friendlyfund.internal";

/** Sign in as the admin, or sign out again. */
export function AdminPanel({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const { notify } = useToast();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!password) return setError("Enter the admin password.");

    startTransition(async () => {
      try {
        const credential = await signInWithEmailAndPassword(
          clientAuth,
          ADMIN_EMAIL,
          password
        );
        const idToken = await credential.user.getIdToken();

        const result = await login(idToken);
        if (!result.ok) {
          setError(result.error);
          setPassword("");
          return;
        }

        notify("Signed in as admin");
        router.push("/");
      } catch {
        setError("That password is not right.");
        setPassword("");
      }
    });
  }

  function signOut() {
    startTransition(async () => {
      await logout();
      notify("Signed out");
      router.refresh();
    });
  }

  if (signedIn) {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-up/12 text-2xl">
          ✓
        </div>
        <div>
          <p className="text-base font-extrabold text-ink">Signed in</p>
          <p className="mt-1 text-sm font-medium text-ink-soft">
            The + button and the edit controls are now available across the app.
          </p>
        </div>
        <motion.button
          type="button"
          onClick={signOut}
          disabled={pending}
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-2xl bg-ink/8 py-3.5 text-sm font-bold text-ink-soft disabled:opacity-50"
        >
          {pending ? "Signing out…" : "Sign out"}
        </motion.button>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold tracking-wide text-ink-faint uppercase">
          Admin password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          autoComplete="current-password"
          autoFocus
          placeholder="••••••••"
          className="rounded-2xl bg-white/70 px-4 py-3.5 text-base font-semibold text-ink ring-1 ring-white/80 outline-none placeholder:text-ink-faint/70 focus:ring-turquoise"
        />
      </label>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm font-semibold text-down"
        >
          {error}
        </motion.p>
      )}

      <motion.button
        type="submit"
        disabled={pending || !password}
        whileTap={password ? { scale: 0.97 } : undefined}
        className={`w-full rounded-2xl bg-gradient-to-br from-turquoise to-cobalt py-4 text-base font-bold text-white ${
          password && !pending
            ? "shadow-[0_14px_30px_-12px_rgba(41,153,104,0.9)]"
            : "opacity-45"
        }`}
      >
        {pending ? "Checking…" : "Sign in"}
      </motion.button>
    </form>
  );
}
