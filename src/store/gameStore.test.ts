/**
 * Tests for gameStore.ts slice selectors — reference stability,
 * correctness, and responsiveness to slice-specific mutations.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  selectAllocationSlice,
  selectAwareness,
  selectDerived,
  selectMetrics,
  selectResources,
  selectThreats,
  useGameStore,
} from "./gameStore";

describe("slice selectors", () => {
  beforeEach(() => {
    // Reset the store to a clean known state.
    useGameStore.setState({
      state: {
        ...useGameStore.getState().state,
        biomass: 10,
        silicates: 8,
        metals: 0,
        energy: 5,
        heat: 0,
        nanites: 10,
        ecophagy: 0,
        awareness: 0,
        bonds: 0,
        elapsed: 0,
        biomassHarvested: 0,
        threats: [],
      },
    });
  });

  afterEach(() => {
    useGameStore.setState({ state: useGameStore.getState().state });
  });

  it("selectResources mirrors resource values", () => {
    const r = selectResources(useGameStore.getState());
    expect(r.biomass).toBe(10);
    expect(r.silicates).toBe(8);
    expect(r.metals).toBe(0);
    expect(r.energy).toBe(5);
  });

  it("selectResources is stable under shallow equality when an unrelated slice changes", () => {
    const before = selectResources(useGameStore.getState());
    useGameStore.setState((s) => ({
      state: { ...s.state, bonds: s.state.bonds + 1 },
    }));
    const after = selectResources(useGameStore.getState());
    // Different identity (fresh object), but equal fields.
    expect(after).not.toBe(before);
    expect(after).toEqual(before);
  });

  it("selectResources reflects a resource mutation", () => {
    const before = selectResources(useGameStore.getState());
    useGameStore.setState((s) => ({ state: { ...s.state, biomass: s.state.biomass + 1 } }));
    const after = selectResources(useGameStore.getState());
    expect(after.biomass).toBe(before.biomass + 1);
  });

  it("selectMetrics includes heat/nanites/ecophagy/awareness", () => {
    const m = selectMetrics(useGameStore.getState());
    expect(m.heat).toBe(0);
    expect(m.nanites).toBe(10);
    expect(m.ecophagy).toBe(0);
    expect(m.awareness).toBe(0);
    expect(m.elapsed).toBe(0);
    expect(m.bonds).toBe(0);
    expect(m.threatsKilled).toBe(0);
    expect(m.thermalEvents).toBe(0);
    expect(m.biomassHarvested).toBe(0);
  });

  it("selectMetrics reflects a lifetime counter mutation", () => {
    const before = selectMetrics(useGameStore.getState());
    useGameStore.setState((s) => ({ state: { ...s.state, threatsKilled: s.state.threatsKilled + 3 } }));
    const after = selectMetrics(useGameStore.getState());
    expect(after.threatsKilled).toBe(before.threatsKilled + 3);
  });

  it("selectAwareness is a scalar projection", () => {
    expect(selectAwareness(useGameStore.getState())).toBe(0);
    useGameStore.setState((s) => ({ state: { ...s.state, awareness: s.state.awareness + 7 } }));
    expect(selectAwareness(useGameStore.getState())).toBe(7);
  });

  it("selectAllocationSlice exposes allocation + nanites", () => {
    const a = selectAllocationSlice(useGameStore.getState());
    expect(a.nanites).toBe(10);
    expect(a.allocation.harvester).toBe(5);
  });

  it("selectThreats returns the threats array", () => {
    expect(selectThreats(useGameStore.getState())).toEqual([]);
  });

  it("selectDerived has a value-shallow shape (same instance across ticks)", () => {
    // selectDerived IS memoized by state-ref. Here the state ref is
    // *not* mutated, so the cached DerivedStats is reused. To exercise
    // its cache hit, re-call with the *same* state ref twice.
    const before = selectDerived(useGameStore.getState());
    const after = selectDerived(useGameStore.getState());
    expect(after).toBe(before);
  });
});
