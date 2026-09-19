import type { SVGProps } from "react";

/** Hand-drawn stroke icons so the set stays consistent and ships no font. */

type IconProps = SVGProps<SVGSVGElement> & { filled?: boolean };

function Base({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HomeIcon({ filled, ...props }: IconProps) {
  return (
    <Base {...props}>
      <path
        d="M3.5 10.6 12 4l8.5 6.6V19a1.5 1.5 0 0 1-1.5 1.5h-3.4v-5.2a1.4 1.4 0 0 0-1.4-1.4h-2.4a1.4 1.4 0 0 0-1.4 1.4v5.2H5A1.5 1.5 0 0 1 3.5 19Z"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.16 : 0}
      />
    </Base>
  );
}

export function MembersIcon({ filled, ...props }: IconProps) {
  return (
    <Base {...props}>
      <circle
        cx="9.2"
        cy="8.4"
        r="3.4"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.16 : 0}
      />
      <path
        d="M3.2 19.4c.5-3.2 3-5.2 6-5.2s5.5 2 6 5.2"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.16 : 0}
      />
      <path d="M16.4 5.5a3 3 0 0 1 0 5.9M18 14.6c2 .7 3.3 2.5 3.6 4.8" />
    </Base>
  );
}

export function StatsIcon({ filled, ...props }: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 19.5h16" />
      <rect
        x="5.5"
        y="11"
        width="3.6"
        height="6"
        rx="1.4"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.18 : 0}
      />
      <rect
        x="10.2"
        y="7"
        width="3.6"
        height="10"
        rx="1.4"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.18 : 0}
      />
      <rect
        x="14.9"
        y="3.6"
        width="3.6"
        height="13.4"
        rx="1.4"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.18 : 0}
      />
    </Base>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base strokeWidth={2.4} {...props}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Base>
  );
}

export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base strokeWidth={2.1} {...props}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Base>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base strokeWidth={2.1} {...props}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </Base>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m15.6 15.6 3.9 3.9" />
    </Base>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base strokeWidth={2.2} {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Base>
  );
}

export function CameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M3.5 8.8A1.8 1.8 0 0 1 5.3 7h2l1.2-2h7l1.2 2h2a1.8 1.8 0 0 1 1.8 1.8v8.4A1.8 1.8 0 0 1 18.7 19H5.3a1.8 1.8 0 0 1-1.8-1.8Z" />
      <circle cx="12" cy="12.8" r="3.3" />
    </Base>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4.8 6.8h14.4M9.5 6.8V5.2a1.2 1.2 0 0 1 1.2-1.2h2.6a1.2 1.2 0 0 1 1.2 1.2v1.6" />
      <path d="M6.6 6.8 7.5 19a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3l.9-12.2" />
      <path d="M10.4 10.4v6M13.6 10.4v6" />
    </Base>
  );
}

export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M15.6 4.6a2 2 0 0 1 2.8 2.8L8.7 17.1l-3.6 1 1-3.6Z" />
    </Base>
  );
}

export function ArrowUpRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base strokeWidth={2.1} {...props}>
      <path d="M7.5 16.5 16.5 7.5M9.2 7.5h7.3v7.3" />
    </Base>
  );
}

export function ArrowDownLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base strokeWidth={2.1} {...props}>
      <path d="M16.5 7.5 7.5 16.5M14.8 16.5H7.5V9.2" />
    </Base>
  );
}

export function TrendUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base strokeWidth={2} {...props}>
      <path d="M4 15.5 9.5 10l3.5 3.5L20 6.8" />
      <path d="M15.2 6.8H20v4.8" />
    </Base>
  );
}

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3.8" y="5.4" width="16.4" height="14.2" rx="3" />
      <path d="M3.8 10h16.4M8.4 3.6v3.4M15.6 3.6v3.4" />
    </Base>
  );
}

/** Receipt with a checkmark, for "paid this month". */
export function ReceiptCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M6.2 4.4h9.4l2.2 2.2v12.8a1 1 0 0 1-1 1H6.2a1 1 0 0 1-1-1V5.4a1 1 0 0 1 1-1Z" />
      <path d="M8.4 9.6h7.2M8.4 12.8h4.6" strokeLinecap="round" />
      <path d="M13.4 16.4l1.6 1.6 2.8-3.2" strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}

export function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M3.8 8.2A2.4 2.4 0 0 1 6.2 5.8h11.4a2.4 2.4 0 0 1 2.4 2.4v8.2a2.4 2.4 0 0 1-2.4 2.4H6.2a2.4 2.4 0 0 1-2.4-2.4Z" />
      <path d="M16.2 11.4h4v3.4h-4a1.7 1.7 0 0 1 0-3.4Z" />
    </Base>
  );
}

/** Signed-in admin, in the header — tapping signs out directly. */
export function LogoutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M10.5 4.5H6.8a1.3 1.3 0 0 0-1.3 1.3v12.4a1.3 1.3 0 0 0 1.3 1.3h3.7" />
      <path d="M20 12H10.2M20 12l-3.5-3.5M20 12l-3.5 3.5" />
    </Base>
  );
}

/** Signed-out visitor, in the header. */
export function MoneyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.4v9.2" />
      <path d="M14.6 9.4a2.6 2.6 0 0 0-2.6-1.2c-1.6 0-2.6.8-2.6 1.9 0 2.6 5.2 1.3 5.2 3.9 0 1.1-1 1.9-2.6 1.9a2.6 2.6 0 0 1-2.6-1.2" />
    </Base>
  );
}

/** A small sprout: growth, decorative accent on the summary card. */
export function SproutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" {...props} aria-hidden="true">
      <path
        d="M32 58V30"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M32 34C32 20 20 16 10 16c0 14 10 20 22 20Z"
        fill="currentColor"
        fillOpacity=".9"
      />
      <path
        d="M32 26C32 14 42 10 52 10c0 12-10 18-20 18Z"
        fill="currentColor"
        fillOpacity=".75"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------- *
 * Empty-state illustrations
 * -------------------------------------------------------------------- */

export function EmptyWalletArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 160" fill="none" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="ew-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#63c66c" />
          <stop offset="100%" stopColor="#e4f5e9" />
        </linearGradient>
        <linearGradient id="ew-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#299968" />
          <stop offset="100%" stopColor="#24794c" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="136" rx="62" ry="9" fill="#123c35" opacity=".07" />

      {/* Card, peeking out from behind the wallet body */}
      <rect
        x="66"
        y="18"
        width="66"
        height="42"
        rx="9"
        fill="#fff"
        stroke="#e4f5e9"
        strokeWidth="2"
        transform="rotate(-6 99 39)"
      />

      <rect
        x="42"
        y="52"
        width="116"
        height="74"
        rx="18"
        fill="url(#ew-a)"
        opacity=".85"
      />
      <rect
        x="42"
        y="52"
        width="116"
        height="74"
        rx="18"
        stroke="#fff"
        strokeWidth="2.5"
        opacity=".7"
      />

      <rect x="118" y="80" width="46" height="24" rx="12" fill="url(#ew-b)" />
      <circle cx="134" cy="92" r="5" fill="#fff" opacity=".9" />
      <circle cx="66" cy="34" r="4" fill="#299968" />
      <circle cx="34" cy="92" r="3.4" fill="#e4f5e9" />

      {/* Sparkle accent */}
      <g stroke="#f0b23e" strokeWidth="3.4" strokeLinecap="round">
        <path d="M152 16l-5 12" />
        <path d="M168 30l-12 7" />
      </g>
    </svg>
  );
}

export function EmptyPeopleArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 160" fill="none" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="ep-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e4f5e9" />
          <stop offset="100%" stopColor="#e4f5e9" />
        </linearGradient>
        <linearGradient id="ep-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#299968" />
          <stop offset="100%" stopColor="#63c66c" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="136" rx="60" ry="9" fill="#123c35" opacity=".07" />
      <circle cx="72" cy="66" r="22" fill="url(#ep-a)" opacity=".9" />
      <path
        d="M40 126c2.6-17 15.4-27 32-27s29.4 10 32 27"
        fill="url(#ep-a)"
        opacity=".9"
      />
      <circle cx="132" cy="74" r="16" fill="url(#ep-b)" opacity=".9" />
      <path
        d="M108 126c2-12.6 11.6-20 24-20s22 7.4 24 20"
        fill="url(#ep-b)"
        opacity=".9"
      />
      <circle cx="44" cy="38" r="4" fill="#63c66c" />
      <circle cx="160" cy="42" r="3.2" fill="#e4f5e9" />
    </svg>
  );
}

export function EmptyChartArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 200 160" fill="none" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="ec-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#63c66c" />
          <stop offset="100%" stopColor="#e4f5e9" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="136" rx="60" ry="9" fill="#123c35" opacity=".07" />
      <rect x="40" y="94" width="22" height="34" rx="10" fill="url(#ec-a)" opacity=".5" />
      <rect x="70" y="74" width="22" height="54" rx="10" fill="url(#ec-a)" opacity=".7" />
      <rect x="100" y="56" width="22" height="72" rx="10" fill="url(#ec-a)" opacity=".85" />
      <rect x="130" y="38" width="22" height="90" rx="10" fill="url(#ec-a)" />
      <path
        d="M44 60 76 44l30 12 40-24"
        stroke="#299968"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 8"
      />
      <circle cx="146" cy="32" r="5" fill="#299968" />
    </svg>
  );
}
