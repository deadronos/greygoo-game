/**
 * Tests for upgrades.ts — catalog integrity + per-upgrade mutator.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { createInitialState } from "./state";
import { findUpgrade, UPGRADES } from "./upgrades";

describe("UPGRADES catalog integrity", () => {
  it("has 12 documented upgrades", () => {
    expect(UPGRADES.length).toBe(12);
  });

  it("ids are unique", () => {
    const ids = UPGRADES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every cost is non-negative", () => {
    for (const u of UPGRADES) {
      for (const v of Object.values(u.cost)) {
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("every upgrade has a name, desc, and an apply mutator", () => {
    for (const u of UPGRADES) {
      expect(u.name.length).toBeGreaterThan(0);
      expect(u.desc.length).toBeGreaterThan(0);
      expect(typeof u.apply).toBe("function");
    }
  });
});

describe("findUpgrade", () => {
  it("returns the upgrade by id", () => {
    expect(findUpgrade("harv1")?.name).toBe("PROTEASE LATTICE");
  });

  it("returns undefined for unknown ids", () => {
    expect(findUpgrade("nope")).toBeUndefined();
  });
});

describe("upgrade mutators", () => {
  let s: ReturnType<typeof createInitialState>;
  beforeEach(() => {
    s = createInitialState();
  });

  it("harv1: +30% yield", () => {
    findUpgrade("harv1")!.apply(s);
    expect(s.harvYieldMul).toBeCloseTo(1.3);
  });

  it("harv2: -25% harvester heat", () => {
    findUpgrade("harv2")!.apply(s);
    expect(s.harvHeatMul).toBeCloseTo(0.75);
  });

  it("rad1: +40% cooling", () => {
    findUpgrade("rad1")!.apply(s);
    expect(s.radCoolMul).toBeCloseTo(1.4);
  });

  it("rad2 stacks with rad1 (multiplicative)", () => {
    findUpgrade("rad1")!.apply(s);
    findUpgrade("rad2")!.apply(s);
    expect(s.radCoolMul).toBeCloseTo(1.4 * 1.6);
  });

  it("seek1: +50% seeker damage", () => {
    findUpgrade("seek1")!.apply(s);
    expect(s.seekDmgMul).toBeCloseTo(1.5);
  });

  it("mine1: +0.15/s silicate auto", () => {
    findUpgrade("mine1")!.apply(s);
    expect(s.silAutoAdd).toBeCloseTo(0.15);
  });

  it("mine2: +0.5/s silicate auto and +0.2/s metal auto", () => {
    findUpgrade("mine2")!.apply(s);
    expect(s.silAutoAdd).toBeCloseTo(0.5);
    expect(s.metAutoAdd).toBeCloseTo(0.2);
  });

  it("refine1: unlocks canRefine", () => {
    findUpgrade("refine1")!.apply(s);
    expect(s.canRefine).toBe(true);
  });

  it("tol1: raises heatCapBonus by 25", () => {
    findUpgrade("tol1")!.apply(s);
    expect(s.heatCapBonus).toBe(25);
  });

  it("auto1: enables auto-allocate", () => {
    findUpgrade("auto1")!.apply(s);
    expect(s.autoAlloc).toBe(1);
  });

  it("immune1: stacks", () => {
    findUpgrade("immune1")!.apply(s);
    findUpgrade("immune1")!.apply(s);
    expect(s.threatSuppression).toBeCloseTo(0.5);
  });

  it("boom1: -40% click heat AND +30% click energy", () => {
    findUpgrade("boom1")!.apply(s);
    expect(s.clickHeatMul).toBeCloseTo(0.6);
    expect(s.clickEnergyMul).toBeCloseTo(1.3);
  });
});
