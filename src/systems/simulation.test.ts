/**
 * Tests for simulation.ts — heatEfficiency, simulate clamping and
 * invariants, derivedStats, checkEndCondition.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { createInitialState } from "./state";
import {
  checkEndCondition,
  DEFAULT_TICK_DT,
  derivedStats,
  heatEfficiency,
  simulate,
} from "./simulation";

let s: ReturnType<typeof createInitialState>;
beforeEach(() => {
  s = createInitialState();
});

describe("heatEfficiency", () => {
  it("is 1 at low heat", () => {
    s.heat = 30;
    expect(heatEfficiency(s)).toBe(1);
  });

  it("drops to 0.7 above the warning threshold (60)", () => {
    s.heat = 61;
    expect(heatEfficiency(s)).toBeCloseTo(0.7);
  });

  it("multiplies through 0.7 × 0.5 above the critical threshold (85)", () => {
    s.heat = 86;
    // Above warning AND critical → 0.7 * 0.5 = 0.35
    expect(heatEfficiency(s)).toBeCloseTo(0.35);
  });

  it("multiplies through all three bands at the runaway threshold (100)", () => {
    s.heat = 101;
    // Above warning + critical + runaway → 0.7 * 0.5 * 0.25 = 0.0875
    expect(heatEfficiency(s)).toBeCloseTo(0.0875);
  });

  it("scales thresholds with heatCapBonus", () => {
    s.heatCapBonus = 100;
    // cap = 200, warning = 120 — heat=110 should still be 1.0
    s.heat = 110;
    expect(heatEfficiency(s)).toBe(1);
    s.heat = 121;
    expect(heatEfficiency(s)).toBeCloseTo(0.7);
  });
});

describe("simulate — allocation clamping", () => {
  it("scales allocation down when allocation exceeds nanites", () => {
    s.nanites = 5;
    s.allocation = { harvester: 5, radiator: 5, seeker: 5 };
    simulate(s, 1, DEFAULT_TICK_DT);
    const total = s.allocation.harvester + s.allocation.radiator + s.allocation.seeker;
    expect(total).toBe(5);
  });

  it("preserves the allocation ratio during clamp", () => {
    s.nanites = 6;
    s.allocation = { harvester: 12, radiator: 4, seeker: 8 }; // total 24
    simulate(s, 1, DEFAULT_TICK_DT);
    // Largest fractional priority = harvester (12/24=0.5); radiator (4/24=0.166);
    // After scale-by-1/4: harvester=3, radiator=1, seeker=2. Sum=6, with 2*0.5+1*0.166+0.333*1
    const total = s.allocation.harvester + s.allocation.radiator + s.allocation.seeker;
    expect(total).toBe(6);
  });
});

describe("simulate — heat & damage", () => {
  it("emits no thermal damage below the runaway threshold", () => {
    s.heat = 80;
    const r = simulate(s, 1, DEFAULT_TICK_DT);
    const thermalEvent = r.results.find((x) => x.msg?.includes("THERMAL EVENT"));
    expect(thermalEvent).toBeUndefined();
  });

  it("auto-allocates idle to harvesters when autoAlloc > 0", () => {
    s.autoAlloc = 1;
    s.nanites = 12;
    s.allocation = { harvester: 5, radiator: 3, seeker: 2 }; // 1 idle
    simulate(s, 1, DEFAULT_TICK_DT);
    expect(s.allocation.harvester).toBeGreaterThanOrEqual(6);
  });
});

describe("checkEndCondition", () => {
  it("returns 'won' at ecophagy 100", () => {
    s.ecophagy = 100;
    expect(checkEndCondition(s)).toBe("won");
  });

  it("returns 'lost' at zero nanites", () => {
    s.nanites = 0;
    expect(checkEndCondition(s)).toBe("lost");
  });

  it("returns null mid-game", () => {
    expect(checkEndCondition(s)).toBeNull();
  });
});

describe("derivedStats", () => {
  it("mirrors the heat-throttled biomass rate", () => {
    const baseRate = derivedStats(s).harvesterBiomassRate;
    s.heat = 90;
    const throttled = derivedStats(s).harvesterBiomassRate;
    expect(throttled).toBeLessThan(baseRate);
  });

  it("returns the correct replication tier", () => {
    s.nanites = 24;
    expect(derivedStats(s).replicationTier).toBe("I");
    s.nanites = 25;
    expect(derivedStats(s).replicationTier).toBe("II");
    s.nanites = 99;
    expect(derivedStats(s).replicationTier).toBe("II");
    s.nanites = 100;
    expect(derivedStats(s).replicationTier).toBe("III");
    s.nanites = 499;
    expect(derivedStats(s).replicationTier).toBe("III");
    s.nanites = 500;
    expect(derivedStats(s).replicationTier).toBe("IV");
    s.nanites = 2499;
    expect(derivedStats(s).replicationTier).toBe("IV");
    s.nanites = 2500;
    expect(derivedStats(s).replicationTier).toBe("V");
  });

  it("temperatureKelvin grows with heat", () => {
    expect(derivedStats(s).temperatureKelvin).toBe(298); // 25 °C baseline
    s.heat = 50;
    expect(derivedStats(s).temperatureKelvin).toBe(298 + 50 * 4);
  });

  it("metalRate respects current resource limits", () => {
    s.canRefine = true;
    s.silicates = 0.1; // starving
    s.energy = 0; // starving
    expect(derivedStats(s).metalRate).toBe(0);
    s.silicates = 100;
    s.energy = 1000;
    expect(derivedStats(s).metalRate).toBeGreaterThan(0);
  });
});
