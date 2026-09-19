/** Shimmering placeholders so a slow query never shows a blank screen. */
export default function Loading() {
  return (
    <div>
      <div className="mb-5 space-y-2">
        <div className="skeleton h-4 w-28 rounded-full" />
        <div className="skeleton h-7 w-52 rounded-full" />
      </div>

      <div className="skeleton h-40 rounded-[var(--radius-glass)]" />

      <div className="mt-7 space-y-2">
        <div className="skeleton mb-3 h-3 w-32 rounded-full" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-[68px] rounded-[var(--radius-glass)]" />
        ))}
      </div>
    </div>
  );
}
