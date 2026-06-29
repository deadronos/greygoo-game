/**
 * Tests for actions.ts — breakBond, mineSilicates, refineMetals,
 * replicateNanite, changeAllocation, buyUpgrade.
 *
 * These tests exercise existing behavior (the player action surface has
 * no bugs in scope). They lock in:
 *   - thermal lockout blocks breakBond
 *   - insufficient resources short-circuit
 *   - new nanites are NOT auto-allocated (regression guard)
 *   - allocation step is clamped to actionable bounds
 *   - upgrades consume cost, apply mutator, reject duplicates
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  breakBond,
  buyUpgrade,
  changeAllocation,
  mineSilicates,
  refineMetals,
  replicateNanite,
} from "./actions";
import { createInitialState } from "./state";

let s: ReturnType<typeof createInitialState>;
beforeEach(() => {
  s = createInitialState();
});

describe("breakBond", () => {
  it("is blocked by thermal lockout (heat >= 1.2 × cap)", () => {
    s.heat = 121; // 1.2 × 100
    const o = breakBond(s);
    expect(o.mutated).toBe(false);
    expect(o.result.level).toBe("warn");
    expect(o.result.msg).toMatch(/lockout/i);
  });

  it("gains energy, heat, biomass on success", () => {
    const o = breakBond(s);
    expect(o.mutated).toBe(true);
    expect(o.result.pulse).toBe("biomass");
    expect(s.energy).toBeGreaterThan(5);
    expect(s.heat).toBeGreaterThan(0);
    expect(s.biomass).toBeGreaterThan(5);
    expect(s.bonds).toBe(1);
  });

  it("tracks biomassHarvested on click biomass (mirror accounting)", () => {
    const before = s.biomassHarvested;
    breakBond(s);
    expect(s.biomassHarvested).toBeGreaterThan(before);
  });
});

describe("mineSilicates", () => {
  it("fails silently without energy", () => {
    s.energy = 0;
    const o = mineSilicates(s);
    expect(o.mutated).toBe(false);
    expect(o.result.msg).toMatch(/insufficient/i);
  });

  it("subtracts energy, adds silicate, absorbs heat on success", () => {
    s.heat = 5;
    const before = s.silicates;
    const o = mineSilicates(s);
    expect(o.mutated).toBe(true);
    expect(s.energy).toBe(4);
    expect(s.silicates).toBe(before + 1);
    expect(s.heat).toBeLessThanOrEqual(3);
    expect(o.result.pulse).toBe("silicates");
  });
});

describe("refineMetals", () => {
  it("fails without canRefine", () => {
    const o = refineMetals(s);
    expect(o.mutated).toBe(false);
    expect(o.result.msg).toMatch(/protocol/i);
  });

  it("fails without resources when canRefine is set", () => {
    s.canRefine = true;
    s.silicates = 0;
    s.energy = 5;
    const o = refineMetals(s);
    expect(o.mutated).toBe(false);
  });

  it("succeeds when canRefine and resources suffice", () => {
    s.canRefine = true;
    s.silicates = 5;
    s.energy = 5;
    const o = refineMetals(s);
    expect(o.mutated).toBe(true);
    expect(s.metals).toBe(1);
    expect(s.silicates).toBe(4);
    expect(s.energy).toBe(3);
    expect(o.result.pulse).toBe("metals");
  });
});

describe("replicateNanite", () => {
  it("fails when short on energy", () => {
    // Initial energy 5, cost = floor(8 + 10 * 1.5) = 23
    expect(replicateNanite(s).mutated).toBe(false);
  });

  it("fails when short on biomass", () => {
    s.energy = 50;
    s.biomass = 0;
    expect(replicateNanite(s).mutated).toBe(false);
  });

  it("replicates a nanite when affordable", () => {
    s.biomass = 50;
    s.energy = 100;
    const before = s.nanites;
    const o = replicateNanite(s);
    expect(o.mutated).toBe(true);
    expect(s.nanites).toBe(before + 1);
  });

  it("leaves the new nanite unallocated (no auto-harvester bias)", () => {
    s.biomass = 50;
    s.energy = 100;
    const total =
      s.allocation.harvester + s.allocation.radiator + s.allocation.seeker;
    replicateNanite(s);
    const afterTotal =
      s.allocation.harvester + s.allocation.radiator + s.allocation.seeker;
    expect(afterTotal).toBe(total);
  });
});

describe("changeAllocation", () => {
  it("is a no-op when fully allocated and delta > 0", () => {
    s.allocation.harvester = 10;
    s.allocation.radiator = 0;
    s.allocation.seeker = 0;
    const o = changeAllocation(s, "harvester", 5);
    expect(o.mutated).toBe(false);
  });

  it("clamps -step down to current (no overshoot below zero)", () => {
    s.allocation.harvester = 2;
    const o = changeAllocation(s, "harvester", -10);
    // step clamps to -2; allocation becomes 0 and mutated=true
    expect(o.mutated).toBe(true);
    expect(s.allocation.harvester).toBe(0);
  });

  it("rejects negative delta on empty morph", () => {
    s.allocation.seeker = 0;
    const o = changeAllocation(s, "seeker", -1);
    expect(o.mutated).toBe(false);
  });

  it("adds to a morph when there's idle capacity", () => {
    s.allocation.harvester = 5;
    s.allocation.radiator = 3;
    s.allocation.seeker = 1; // total 9, idle 1
    const o = changeAllocation(s, "seeker", 1);
    expect(o.mutated).toBe(true);
    expect(s.allocation.seeker).toBe(2);
  });
});

describe("buyUpgrade", () => {
  it("rejects unknown id", () => {
    const o = buyUpgrade(s, "nope-id");
    expect(o.outcome.mutated).toBe(false);
    expect(o.outcome.result.ok).toBe(false);
  });

  it("rejects when player can't afford", () => {
    s.biomass = 0;
    const o = buyUpgrade(s, "harv1");
    expect(o.outcome.mutated).toBe(false);
  });

  it("consumes cost and applies the mutator on success", () => {
    s.biomass = 100;
    const o = buyUpgrade(s, "harv1");
    expect(o.outcome.mutated).toBe(true);
    expect(s.biomass).toBe(75);
    expect(s.harvYieldMul).toBeCloseTo(1.3);
    expect(s.upgrades.harv1).toBe(true);
  });

  it("rejects re-purchase", () => {
    s.biomass = 200;
    buyUpgrade(s, "harv1");
    const o2 = buyUpgrade(s, "harv1");
    expect(o2.outcome.mutated).toBe(false);
    expect(o2.outcome.result.msg).toMatch(/already/i);
  });
});
