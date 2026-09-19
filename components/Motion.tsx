"use client";

import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { formatRupees } from "@/lib/money";

/** Screen-level entrance: content rises into place as the route settles. */
export function Screen({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Staggered list container — pair with <Stagger.Item>. */
export function Stagger({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="shown"
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: 0.055, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A child of <Stagger>. Kept as its own export rather than `Stagger.Item`:
 * properties hung off a client component are lost crossing the server boundary.
 */
export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.98 },
        shown: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: "spring", stiffness: 380, damping: 32 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Press feedback that reads as native: a quick, springy squeeze. */
export function Tap({
  children,
  className = "",
  scale = 0.96,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  scale?: number;
} & React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      whileTap={{ scale }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Rupee amount that counts up when it scrolls into view.
 * Falls back to the final value when the user prefers reduced motion.
 */
export function CountUpRupees({
  value,
  className = "",
  decimals = false,
  sign = false,
  duration = 1.1,
}: {
  value: number;
  className?: string;
  decimals?: boolean;
  sign?: boolean;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();

  // Starts at the real figure so the server-rendered HTML is already correct;
  // the client rewinds to zero and counts up once the element is on screen.
  const raw = useMotionValue(value);
  const spring = useSpring(raw, {
    duration: duration * 1000,
    bounce: 0,
  });
  const text = useTransform(spring, (v) =>
    formatRupees(decimals ? v : Math.round(v), { decimals, sign })
  );
  const played = useRef(false);

  useEffect(() => {
    if (reduced || !inView || played.current) {
      raw.jump(value);
      spring.jump(value);
      return;
    }
    played.current = true;
    raw.jump(0);
    spring.jump(0);
    raw.set(value);
  }, [inView, value, raw, spring, reduced]);

  return (
    <motion.span ref={ref} className={`tabular ${className}`}>
      {text}
    </motion.span>
  );
}

export { motion };
