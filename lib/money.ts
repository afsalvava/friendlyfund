/**
 * Money helpers. Amounts are handled as plain numbers of rupees at the UI edge,
 * and stored as Decimal(12,2) in Postgres.
 */

/** Format a rupee amount with Indian digit grouping, e.g. 245000 -> "₹2,45,000". */
export function formatRupees(
  amount: number,
  opts: { decimals?: boolean; sign?: boolean } = {}
): string {
  const { decimals = false, sign = false } = opts;
  const abs = Math.abs(amount);
  const body = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(abs);

  const prefix = amount < 0 ? "−" : sign ? "+" : "";
  return `${prefix}₹${body}`;
}

/** Compact form for tight spaces: 245000 -> "₹2.45L", 12000000 -> "₹1.2Cr". */
export function formatRupeesCompact(amount: number): string {
  const abs = Math.abs(amount);
  const prefix = amount < 0 ? "−₹" : "₹";

  if (abs >= 1_00_00_000) return `${prefix}${trimZeros(abs / 1_00_00_000)}Cr`;
  if (abs >= 1_00_000) return `${prefix}${trimZeros(abs / 1_00_000)}L`;
  if (abs >= 1_000) return `${prefix}${trimZeros(abs / 1_000)}K`;
  return formatRupees(amount);
}

function trimZeros(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Parse user input into a rupee amount. Accepts "5,000", "₹5000", "5000.50".
 * Returns null when the input is not a positive finite amount.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;

  return Math.round(value * 100) / 100;
}

export type Movement = { type: "DEPOSIT" | "WITHDRAWAL"; amount: number };

/** Net balance for a set of movements: deposits in, withdrawals out. */
export function balanceOf(movements: Movement[]): number {
  const total = movements.reduce(
    (sum, m) => sum + (m.type === "DEPOSIT" ? m.amount : -m.amount),
    0
  );
  return Math.round(total * 100) / 100;
}

/** Split a set of movements into deposit and withdrawal totals. */
export function splitTotals(movements: Movement[]): {
  deposits: number;
  withdrawals: number;
} {
  let deposits = 0;
  let withdrawals = 0;
  for (const m of movements) {
    if (m.type === "DEPOSIT") deposits += m.amount;
    else withdrawals += m.amount;
  }
  return {
    deposits: Math.round(deposits * 100) / 100,
    withdrawals: Math.round(withdrawals * 100) / 100,
  };
}

/** Percentage change from `previous` to `current`, or null when there is no base. */
export function percentChange(
  current: number,
  previous: number
): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
