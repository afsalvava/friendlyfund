import Image from "next/image";
import { gradientFor, initialsOf } from "@/lib/grouping";

const SIZES = {
  sm: "size-10 text-[13px]",
  md: "size-12 text-sm",
  lg: "size-16 text-lg",
  xl: "size-24 text-3xl",
} as const;

export function Avatar({
  name,
  photoUrl,
  size = "md",
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const shell = `relative shrink-0 overflow-hidden rounded-full ring-2 ring-white/80 shadow-[0_6px_16px_-6px_rgba(18,60,53,0.45)] ${SIZES[size]} ${className}`;

  if (photoUrl) {
    return (
      <div className={shell}>
        <Image
          src={photoUrl}
          alt=""
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${shell} flex items-center justify-center bg-gradient-to-br ${gradientFor(
        name
      )} font-bold text-white`}
    >
      <span className="drop-shadow-sm">{initialsOf(name)}</span>
    </div>
  );
}
