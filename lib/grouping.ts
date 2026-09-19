/** Pure grouping / sorting helpers used by the members and history screens. */

export type Named = { name: string };

/**
 * Sort members A→Z and bucket them under their first letter.
 * Names that do not start with a letter land under "#".
 */
export function groupByLetter<T extends Named>(
  items: T[]
): { letter: string; items: T[] }[] {
  const sorted = [...items].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" })
  );

  const buckets: { letter: string; items: T[] }[] = [];
  for (const item of sorted) {
    const first = item.name.trim().charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : "#";
    const last = buckets[buckets.length - 1];
    if (last && last.letter === letter) last.items.push(item);
    else buckets.push({ letter, items: [item] });
  }
  return buckets;
}

export type Dated = { date: Date };

/** Group entries into month buckets, newest month first, newest entry first. */
export function groupByMonth<T extends Dated>(
  items: T[]
): { key: string; label: string; items: T[] }[] {
  const sorted = [...items].sort((a, b) => b.date.getTime() - a.date.getTime());

  const buckets: { key: string; label: string; items: T[] }[] = [];
  for (const item of sorted) {
    const key = monthKey(item.date);
    const last = buckets[buckets.length - 1];
    if (last && last.key === key) last.items.push(item);
    else buckets.push({ key, label: monthLabel(item.date), items: [item] });
  }
  return buckets;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function shortMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-IN", { month: "short" });
}

/** "Today", "Yesterday", "12 Aug" for this year, "12 Aug 2025" otherwise. */
export function relativeDate(date: Date, now: Date = new Date()): string {
  const days = daysBetween(date, now);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function fullDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Whole calendar days between two dates, ignoring time of day. */
export function daysBetween(a: Date, b: Date): number {
  const dayA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const dayB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round(Math.abs(dayB - dayA) / 86_400_000);
}

/** Initials for the avatar fallback: "Anjali Rao" -> "AR", "Chetan" -> "C". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

/**
 * The Iznik potter's palette — turquoise, cobalt, coral-red, sage and
 * manganese purple — deep enough that white initials stay legible.
 */
const AVATAR_GRADIENTS = [
  "from-cyan-700 to-sky-500",
  "from-blue-800 to-indigo-600",
  "from-orange-700 to-red-500",
  "from-teal-700 to-emerald-500",
  "from-violet-800 to-purple-600",
  "from-sky-800 to-cyan-600",
  "from-rose-700 to-orange-500",
  "from-emerald-800 to-teal-600",
];

/** Stable per-name gradient so a member keeps the same colour everywhere. */
export function gradientFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}
