"use client";

import Link from "next/link";
import { useTransition } from "react";
import { logout } from "@/app/admin/actions";
import { LogoutIcon, MoneyIcon } from "@/components/Icons";
import { useToast } from "@/components/Toast";

/** Header icon: money for a signed-out visitor, a direct logout button for the admin. */
export function ProfileButton({ isAdmin }: { isAdmin: boolean }) {
  const [pending, startTransition] = useTransition();
  const { notify } = useToast();

  if (!isAdmin) {
    return (
      <Link
        href="/admin"
        aria-label="Sign in"
        className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-ink shadow-[0_6px_16px_-8px_rgba(18,60,53,0.35)]"
      >
        <MoneyIcon className="size-5" />
      </Link>
    );
  }

  function handleLogout() {
    startTransition(async () => {
      await logout();
      notify("Signed out");
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      aria-label="Log out"
      className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-down shadow-[0_6px_16px_-8px_rgba(18,60,53,0.35)]"
    >
      <LogoutIcon className="size-5" />
    </button>
  );
}
