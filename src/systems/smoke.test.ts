/**
 * Smoke test — confirms the Vitest harness is wired correctly and that
 * the @ alias resolves to the systems/ modules. This is the first
 * test added; subsequent suites follow the same pattern.
 */

import { describe, expect, it } from "vitest";

import { createInitialState } from "./state";

describe("smoke", () => {
  it("createInitialState returns the documented defaults", () => {
    const s = createInitialState();
    expect(s.nanites).toBe(10);
    expect(s.allocation.harvester).toBe(5);
    expect(s.allocation.radiator).toBe(3);
    expect(s.allocation.seeker).toBe(2);
    expect(s.biomass).toBe(5);
    expect(s.heat).toBe(0);
  });
});
