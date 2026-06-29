/**
 * Tests for format.ts — fmt, fmtInt, fmtTime, pickBand.
 */

import { describe, expect, it } from "vitest";

import { fmt, fmtInt, fmtTime, pickBand } from "./format";

describe("fmt", () => {
  it("returns '0' for zero", () => {
    expect(fmt(0)).toBe("0");
  });
  it("returns '0' for null / undefined / NaN", () => {
    expect(fmt(null)).toBe("0");
    expect(fmt(undefined)).toBe("0");
    expect(fmt(Number.NaN)).toBe("0");
  });
  it("formats integer thousands with separators", () => {
    expect(fmt(1234)).toBe("1,234");
    // 999 falls in the [10, 1000) band which uses fixed(1) → "999.0"
    expect(fmt(999)).toBe("999.0");
  });
  it("uses M / B suffixes for very large numbers", () => {
    expect(fmt(1_500_000)).toMatch(/^1\.50M$/);
    expect(fmt(2_500_000_000)).toMatch(/^2\.50B$/);
  });
});

describe("fmtInt", () => {
  it("truncates fractions and adds separators", () => {
    expect(fmtInt(1234.7)).toBe("1,234");
    expect(fmtInt(-99.4)).toBe("-100");
  });
});

describe("fmtTime", () => {
  it("formats seconds, minutes, and hours", () => {
    expect(fmtTime(0)).toBe("0s");
    expect(fmtTime(45)).toBe("45s");
    expect(fmtTime(60)).toBe("1m 0s");
    expect(fmtTime(125)).toBe("2m 5s");
    expect(fmtTime(3600)).toBe("1h 0m 0s");
    expect(fmtTime(3661)).toBe("1h 1m 1s");
  });
});

describe("pickBand", () => {
  const bands = [
    { max: 30, label: "low" },
    { max: 60, label: "mid" },
    { max: Infinity, label: "high" },
  ];
  it("returns the first band whose max > value", () => {
    expect(pickBand(bands, 5).label).toBe("low");
    expect(pickBand(bands, 29).label).toBe("low");
    expect(pickBand(bands, 30).label).toBe("mid");
    expect(pickBand(bands, 100).label).toBe("high");
  });

  it("falls through to the last band for values beyond all but the last", () => {
    expect(pickBand(bands, 10000).label).toBe("high");
  });
});
