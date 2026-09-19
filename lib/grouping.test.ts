import { describe, expect, it } from "vitest";
import {
  daysBetween,
  gradientFor,
  groupByLetter,
  groupByMonth,
  initialsOf,
  relativeDate,
} from "./grouping";

describe("groupByLetter", () => {
  it("sorts A→Z and buckets by first letter", () => {
    const groups = groupByLetter([
      { name: "Chetan" },
      { name: "Anjali" },
      { name: "Bharath" },
      { name: "Aditya" },
    ]);

    expect(groups.map((g) => g.letter)).toEqual(["A", "B", "C"]);
    expect(groups[0].items.map((i) => i.name)).toEqual(["Aditya", "Anjali"]);
  });

  it("ignores case when sorting", () => {
    const groups = groupByLetter([{ name: "bharath" }, { name: "Anjali" }]);
    expect(groups.map((g) => g.letter)).toEqual(["A", "B"]);
  });

  it("puts non-letter names under #", () => {
    const groups = groupByLetter([{ name: "9 Squad" }, { name: "Anjali" }]);
    expect(groups.map((g) => g.letter)).toEqual(["#", "A"]);
  });

  it("does not mutate the input", () => {
    const input = [{ name: "Chetan" }, { name: "Anjali" }];
    groupByLetter(input);
    expect(input[0].name).toBe("Chetan");
  });
});

describe("groupByMonth", () => {
  it("groups newest month first with newest entry first", () => {
    const groups = groupByMonth([
      { date: new Date(2026, 6, 20) },
      { date: new Date(2026, 7, 1) },
      { date: new Date(2026, 7, 12) },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe("2026-08");
    expect(groups[0].items[0].date.getDate()).toBe(12);
    expect(groups[1].key).toBe("2026-07");
  });

  it("returns nothing for an empty list", () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe("relativeDate", () => {
  const now = new Date(2026, 7, 12);

  it("names today and yesterday", () => {
    expect(relativeDate(new Date(2026, 7, 12, 9), now)).toBe("Today");
    expect(relativeDate(new Date(2026, 7, 11), now)).toBe("Yesterday");
  });

  it("drops the year for dates in the current year", () => {
    expect(relativeDate(new Date(2026, 7, 2), now)).toBe("2 Aug");
  });

  it("keeps the year for older dates", () => {
    expect(relativeDate(new Date(2025, 7, 2), now)).toContain("2025");
  });
});

describe("daysBetween", () => {
  it("counts calendar days regardless of time of day", () => {
    expect(
      daysBetween(new Date(2026, 7, 11, 23), new Date(2026, 7, 12, 1))
    ).toBe(1);
  });
});

describe("initialsOf", () => {
  it("takes first and last initials", () => {
    expect(initialsOf("Anjali Rao")).toBe("AR");
    expect(initialsOf("Chetan")).toBe("C");
    expect(initialsOf("  ravi   kumar  nair ")).toBe("RN");
  });

  it("falls back for a blank name", () => {
    expect(initialsOf("   ")).toBe("?");
  });
});

describe("gradientFor", () => {
  it("is stable for the same name", () => {
    expect(gradientFor("Anjali")).toBe(gradientFor("Anjali"));
  });
});
