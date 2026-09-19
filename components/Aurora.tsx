/** Slow-drifting turquoise, cobalt and coral light. Purely decorative. */
export function Aurora() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="blob blob-a size-[62vmax] bg-cyan/45"
        style={{ top: "-22vmax", left: "-18vmax" }}
      />
      <div
        className="blob blob-b size-[52vmax] bg-sand/55"
        style={{ top: "12vh", right: "-20vmax" }}
      />
      <div
        className="blob blob-c size-[46vmax] bg-cobalt/25"
        style={{ bottom: "-16vmax", left: "-8vmax" }}
      />
      <div
        className="blob blob-a size-[34vmax] bg-coral/25"
        style={{ bottom: "6vh", right: "-6vmax", animationDelay: "-8s" }}
      />

      {/* Keeps the top of the screen clean where two blobs would otherwise
          meet at a visible seam — fades to transparent by mid-screen. */}
      <div
        className="absolute inset-x-0 top-0 h-[34vh] bg-gradient-to-b from-[var(--page)] via-[var(--page)]/70 to-transparent"
      />

      {/* A faint grain layer keeps the large gradients from banding. */}
      <div
        className="absolute inset-0 opacity-[0.14] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
