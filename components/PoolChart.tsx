"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { formatRupees, formatRupeesCompact } from "@/lib/money";
import { shortMonthLabel } from "@/lib/grouping";
import type { MonthPoint } from "@/lib/queries";

/**
 * Pool value over the last months: one series, so no legend — the heading names
 * it. The latest point is directly labelled; the rest read off the crosshair.
 */

const W = 320;
const H = 150;
const PAD = { top: 18, right: 14, bottom: 26, left: 14 };
const SERIES = "#299968";

export function PoolChart({ points }: { points: MonthPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const values = points.map((p) => p.cumulative);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = max - min || 1;

    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const xy = points.map((point, i) => ({
      x:
        PAD.left +
        (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW),
      y: PAD.top + innerH - ((point.cumulative - min) / span) * innerH,
      point,
    }));

    const line = xy
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    const area = `${line} L${xy[xy.length - 1].x.toFixed(1)} ${H - PAD.bottom} L${xy[0].x.toFixed(1)} ${H - PAD.bottom} Z`;

    return { xy, line, area, baseline: H - PAD.bottom };
  }, [points]);

  function trackPointer(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;

    let nearest = 0;
    let best = Infinity;
    geometry.xy.forEach((p, i) => {
      const distance = Math.abs(p.x - x);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });
    setActive(nearest);
  }

  const last = geometry.xy[geometry.xy.length - 1];
  const shown = active !== null ? geometry.xy[active] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={`Total amount collected from ${points[0]?.date.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        })} to now`}
        onPointerMove={(e) => trackPointer(e.clientX)}
        onPointerDown={(e) => trackPointer(e.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id="pool-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES} stopOpacity="0.34" />
            <stop offset="100%" stopColor={SERIES} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Recessive baseline only — no grid cage. */}
        <line
          x1={PAD.left}
          y1={geometry.baseline}
          x2={W - PAD.right}
          y2={geometry.baseline}
          stroke="#123c35"
          strokeOpacity="0.1"
          strokeWidth="1"
        />

        <motion.path
          d={geometry.area}
          fill="url(#pool-fill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
        />

        <motion.path
          d={geometry.line}
          fill="none"
          stroke={SERIES}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Crosshair for the hovered month. */}
        {shown && (
          <g>
            <line
              x1={shown.x}
              y1={PAD.top - 6}
              x2={shown.x}
              y2={geometry.baseline}
              stroke={SERIES}
              strokeOpacity="0.35"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={shown.x}
              cy={shown.y}
              r="5.5"
              fill={SERIES}
              stroke="#fff"
              strokeWidth="2"
            />
          </g>
        )}

        {/* The latest value is always marked and labelled. */}
        {last && !shown && (
          <motion.circle
            cx={last.x}
            cy={last.y}
            r="5"
            fill={SERIES}
            stroke="#fff"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.9 }}
          />
        )}

        {/* Month labels, kept sparse on crowded ranges. */}
        {geometry.xy.map((p, i) => {
          const step = points.length > 8 ? 2 : 1;
          if (i % step !== 0 && i !== points.length - 1) return null;
          return (
            <text
              key={p.point.key}
              x={p.x}
              y={H - 8}
              textAnchor="middle"
              className="fill-[#a8b6b0] text-[9px] font-bold"
            >
              {shortMonthLabel(p.point.date)}
            </text>
          );
        })}
      </svg>

      {/* Value readout: the hovered month, else the current pool. */}
      <div className="pointer-events-none absolute top-0 left-0 rounded-xl bg-white/70 px-2.5 py-1.5 ring-1 ring-white/80">
        <p className="text-[10px] font-bold tracking-wide text-ink-faint uppercase">
          {shown
            ? shown.point.date.toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })
            : "Now"}
        </p>
        <p className="text-sm font-extrabold tabular text-ink">
          {formatRupees((shown ?? last)?.point.cumulative ?? 0)}
        </p>
      </div>
    </div>
  );
}

/** Ranked savers. One hue, length carries the value, every bar directly labelled. */
export function SaverBars({
  rows,
}: {
  rows: { id: string; name: string; balance: number }[];
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.balance)), 1);

  return (
    <ul className="space-y-3">
      {rows.map((row, index) => {
        const width = Math.max((Math.abs(row.balance) / max) * 100, 3);
        return (
          <li key={row.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] font-bold text-ink">
                {index + 1}. {row.name}
              </span>
              <span className="shrink-0 text-[13px] font-extrabold tabular text-ink">
                {formatRupeesCompact(row.balance)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink/6">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{
                  duration: 0.8,
                  delay: 0.1 + index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="h-full rounded-full"
                style={{
                  background:
                    row.balance < 0
                      ? "#c24b4b"
                      : `linear-gradient(90deg, ${SERIES}, #24794c)`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
