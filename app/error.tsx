"use client";

import { useEffect } from "react";

/** Most failures here are "Firestore/Firebase Auth credentials aren't set up right", so say that plainly. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDatabase =
    /firebase|firestore|credential|GOOGLE_APPLICATION_CREDENTIALS|permission-denied|unauthenticated/i.test(
      error.message
    );

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-down/12 text-2xl">
        ⚠️
      </div>

      <div>
        <h1 className="text-lg font-extrabold text-ink">
          {isDatabase ? "Can’t reach Firebase" : "Something went wrong"}
        </h1>
        <p className="mx-auto mt-1.5 max-w-[20rem] text-sm font-medium text-ink-soft">
          {isDatabase
            ? "Check GOOGLE_APPLICATION_CREDENTIALS and the NEXT_PUBLIC_FIREBASE_* vars in .env, then try again."
            : "The screen failed to load. Trying again usually clears it."}
        </p>
      </div>

      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-gradient-to-br from-turquoise to-cobalt px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(41,153,104,0.9)] active:scale-95"
      >
        Try again
      </button>
    </div>
  );
}
