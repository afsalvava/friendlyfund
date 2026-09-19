import Link from "next/link";
import { EmptyPeopleArt } from "@/components/Icons";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <EmptyPeopleArt className="w-44" />
      <div>
        <h1 className="text-lg font-extrabold text-ink">Nothing here</h1>
        <p className="mt-1.5 text-sm font-medium text-ink-soft">
          That member may have been removed.
        </p>
      </div>
      <Link
        href="/members"
        className="rounded-full bg-gradient-to-br from-turquoise to-cobalt px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(41,153,104,0.9)]"
      >
        Back to members
      </Link>
    </div>
  );
}
