import { describe, expect, it } from "vitest";
import {
  balanceOf,
  formatRupees,
  formatRupeesCompact,
  parseAmount,
  percentChange,
  splitTotals,
} from "./money";

describe("formatRupees", () => {
  it("uses Indian digit grouping", () => {
    expect(formatRupees(245000)).toBe("₹2,45,000");
    expect(formatRupees(1000)).toBe("₹1,000");
    expect(formatRupees(100)).toBe("₹100");
    expect(formatRupees(12500000)).toBe("₹1,25,00,000");
  });

  it("marks negatives with a minus and positives only when asked", () => {
    expect(formatRupees(-5000)).toBe("−₹5,000");
    expect(formatRupees(5000, { sign: true })).toBe("+₹5,000");
    expect(formatRupees(5000)).toBe("₹5,000");
  });

  it("shows paise on request", () => {
    expect(formatRupees(1234.5, { decimals: true })).toBe("₹1,234.50");
  });
});

describe("formatRupeesCompact", () => {
  it("shortens thousands, lakhs and crores", () => {
    expect(formatRupeesCompact(999)).toBe("₹999");
    expect(formatRupeesCompact(5000)).toBe("₹5K");
    expect(formatRupeesCompact(245000)).toBe("₹2.45L");
    expect(formatRupeesCompact(12000000)).toBe("₹1.2Cr");
    expect(formatRupeesCompact(-245000)).toBe("−₹2.45L");
  });
});

describe("parseAmount", () => {
  it("accepts rupee symbols, commas and decimals", () => {
    expect(parseAmount("5,000")).toBe(5000);
    expect(parseAmount("₹5000")).toBe(5000);
    expect(parseAmount("1234.56")).toBe(1234.56);
  });

  it("rounds to paise", () => {
    expect(parseAmount("10.005")).toBe(10.01);
  });

  it("rejects empty, zero, negative and non-numeric input", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-50")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("balanceOf", () => {
  it("adds deposits and subtracts withdrawals", () => {
    expect(
      balanceOf([
        { type: "DEPOSIT", amount: 5000 },
        { type: "DEPOSIT", amount: 3000 },
        { type: "WITHDRAWAL", amount: 1000 },
      ])
    ).toBe(7000);
  });

  it("is zero for no movements and can go negative", () => {
    expect(balanceOf([])).toBe(0);
    expect(balanceOf([{ type: "WITHDRAWAL", amount: 500 }])).toBe(-500);
  });

  it("does not accumulate floating point drift", () => {
    expect(
      balanceOf([
        { type: "DEPOSIT", amount: 0.1 },
        { type: "DEPOSIT", amount: 0.2 },
      ])
    ).toBe(0.3);
  });
});

describe("splitTotals", () => {
  it("totals each side separately", () => {
    expect(
      splitTotals([
        { type: "DEPOSIT", amount: 5000 },
        { type: "WITHDRAWAL", amount: 1000 },
        { type: "DEPOSIT", amount: 2000 },
      ])
    ).toEqual({ deposits: 7000, withdrawals: 1000 });
  });
});

describe("percentChange", () => {
  it("computes growth against the previous value", () => {
    expect(percentChange(112, 100)).toBeCloseTo(12);
    expect(percentChange(90, 100)).toBeCloseTo(-10);
  });

  it("returns null when there is no base to compare against", () => {
    expect(percentChange(500, 0)).toBeNull();
  });
});
