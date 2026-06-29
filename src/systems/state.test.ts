/**
 * Tests for state.ts — mergeSave validation hardening, initial-state
 * factory, heatCap.
 *
 * Several of these tests intentionally fail on the as-shipped code so
 * we can verify the defensive guards fire (and then tighten them).
 */

import { describe, expect, it } from "vitest";

import { createInitialState, heatCap, mergeSave } from "./state";
import type { SaveData } from "./types";

describe("mergeSave — allocation hardening", () => {
  it("falls back when allocation has non-numeric values", () => {
    const r = mergeSave({
      state: { allocation: { harvester: "nope", radiator: 7, seeker: 4 } } as never,
    });
    expect(r.state.allocation.harvester).toBe(5); // fallback
    expect(r.state.allocation.radiator).toBe(7);
    expect(r.state.allocation.seeker).toBe(4);
  });

  it("clamps negative allocation values to zero (post-fix)", () => {
    const r = mergeSave({
      state: { allocation: { harvester: 3, radiator: -2, seeker: 1 } } as never,
    });
    expect(r.state.allocation.radiator).toBe(0);
    expect(r.state.allocation.harvester).toBe(3);
    expect(r.state.allocation.seeker).toBe(1);
  });
});

describe("mergeSave — threat hardening", () => {
  it("drops threats whose tier is outside {1,2,3,4}", () => {
    const r = mergeSave({
      state: {
        threats: [
          {
            id: 1,
            hp: 10,
            maxHp: 10,
            dmg: 1,
            type: {
              tier: 999, // OUT OF RANGE
              name: "X",
              desc: "",
              maxHp: 1,
              dmg: 1,
              spawn: 1,
            },
          },
          {
            id: 2,
            hp: 10,
            maxHp: 10,
            dmg: 1,
            type: {
              tier: 2,
              name: "EMP",
              desc: "x",
              maxHp: 1,
              dmg: 1,
              spawn: 1,
            },
          },
        ],
        nextThreatId: 1,
      } as never,
    });
    expect(r.state.threats).toHaveLength(1);
    expect(r.state.threats[0]!.id).toBe(2);
  });

  it("drops threats with non-positive HP or non-positive spawn weight", () => {
    const r = mergeSave({
      state: {
        threats: [
          { id: 1, hp: 0, maxHp: 1, dmg: 1, type: { tier: 1, name: "x", desc: "", maxHp: 1, dmg: 1, spawn: 0.5 } },
          { id: 2, hp: 1, maxHp: 0, dmg: 1, type: { tier: 1, name: "y", desc: "", maxHp: 0, dmg: 1, spawn: 0.5 } },
          { id: 3, hp: 1, maxHp: 1, dmg: 1, type: { tier: 1, name: "z", desc: "", maxHp: 1, dmg: 1, spawn: -1 } },
        ],
        nextThreatId: 1,
      } as never,
    });
    expect(r.state.threats).toHaveLength(0);
  });
});

describe("mergeSave — upgrades hardening", () => {
  it("drops unknown upgrade ids", () => {
    const r = mergeSave({
      state: { upgrades: { harv1: true, fakeUpgrade: true } } as never,
    });
    expect(r.state.upgrades.harv1).toBe(true);
    expect((r.state.upgrades as Record<string, unknown>).fakeUpgrade).toBeUndefined();
  });
});

describe("mergeSave — boolean coercion", () => {
  it("coerces canRefine to a strict boolean", () => {
    const truthy = mergeSave({ state: { canRefine: 1 } as never });
    expect(truthy.state.canRefine).toBe(false); // strict === true

    const yesStr = mergeSave({ state: { canRefine: "true" } as never });
    expect(yesStr.state.canRefine).toBe(false);

    const realTrue = mergeSave({ state: { canRefine: true } as never });
    expect(realTrue.state.canRefine).toBe(true);
  });
});

describe("mergeSave — numeric clamps", () => {
  it("clamps threatSuppression to [0, 1]", () => {
    const a = mergeSave({ state: { threatSuppression: -0.5 } as never });
    const b = mergeSave({ state: { threatSuppression: 5 } as never });
    expect(a.state.threatSuppression).toBe(0);
    expect(b.state.threatSuppression).toBe(1);
  });

  it("clamps resource counts at zero (no negative biomass etc.)", () => {
    const r = mergeSave({
      state: { biomass: -10, silicates: -2, metals: -3, energy: -1 } as never,
    });
    expect(r.state.biomass).toBe(0);
    expect(r.state.silicates).toBe(0);
    expect(r.state.metals).toBe(0);
    expect(r.state.energy).toBe(0);
  });

  it("falls back when biomass is NaN", () => {
    const r = mergeSave({ state: { biomass: "abc" } as never });
    // "abc" is not finite → falls back to initial
    expect(r.state.biomass).toBe(5);
  });
});

describe("mergeSave — nextThreatId", () => {
  it("defaults to 1 when missing", () => {
    const r = mergeSave({} as Partial<SaveData>);
    expect(r.nextThreatId).toBe(1);
  });

  it("clamps non-finite values to 1", () => {
    const r = mergeSave({ nextThreatId: "abc" } as unknown as Partial<SaveData>);
    expect(r.nextThreatId).toBe(1);
  });
});

describe("createInitialState", () => {
  it("yields documented starting values", () => {
    const s = createInitialState();
    expect(s.biomass).toBe(5);
    expect(s.silicates).toBe(8);
    expect(s.metals).toBe(0);
    expect(s.energy).toBe(5);
    expect(s.heat).toBe(0);
    expect(s.ecophagy).toBe(0);
    expect(s.bonds).toBe(0);
    expect(s.threatsKilled).toBe(0);
    expect(s.nextThreatIn).toBe(12);
  });
});

describe("heatCap", () => {
  it("returns the base cap when no chassis bonus", () => {
    expect(heatCap(createInitialState())).toBe(100);
  });

  it("adds heatCapBonus", () => {
    const s = createInitialState();
    s.heatCapBonus = 25;
    expect(heatCap(s)).toBe(125);
  });
});

describe("mergeSave — round-trip preserves basics", () => {
  it("preserves a known save envelope", () => {
    const fresh = createInitialState();
    fresh.biomass = 1234;
    fresh.nanites = 42;
    const envelope: SaveData = {
      state: fresh,
      nextThreatId: 99,
    };
    const r = mergeSave(envelope as unknown as Partial<SaveData>);
    expect(r.state.biomass).toBe(1234);
    expect(r.state.nanites).toBe(42);
    expect(r.nextThreatId).toBe(99);
  });
});
