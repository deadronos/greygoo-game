/**
 * State factory.
 *
 * Produces a fresh `GameState`. Used on reset and as the seed for save
 * deserialization (so missing fields in old saves get filled with
 * defaults).
 */

import {
  HEAT_CAP_BASE,
  STARTING_NANITES,
} from "./constants";
import type { GameState, SaveData } from "./types";

export function createInitialState(): GameState {
  return {
    // resources
    biomass: 5,
    silicates: 8,
    metals: 0,
    energy: 5,

    // thermals
    heat: 0,

    // swarm
    nanites: STARTING_NANITES,
    allocation: { harvester: 5, radiator: 3, seeker: 2 },

    // metrics
    ecophagy: 0,
    awareness: 0,
    bonds: 0,
    threatsKilled: 0,
    thermalEvents: 0,
    totalConsumed: 0,
    elapsed: 0,

    // threats
    threats: [],
    nextThreatIn: 12,

    // upgrades
    upgrades: {},

    // multipliers
    harvYieldMul: 1,
    harvHeatMul: 1,
    radCoolMul: 1,
    seekDmgMul: 1,
    silAutoAdd: 0,
    metAutoAdd: 0,
    clickHeatMul: 1,
    clickEnergyMul: 1,
    heatCapBonus: 0,
    autoAlloc: 0,
    threatSuppression: 0,
    canRefine: false,

    // counters
    nanitesLostToHeat: 0,
  };
}

/** Total thermal ceiling including upgrade bonuses. */
export function heatCap(state: GameState): number {
  return HEAT_CAP_BASE + state.heatCapBonus;
}

/** Merge a save blob onto a fresh state, preserving any new fields. */
export function mergeSave(partial: Partial<SaveData>): { state: GameState; nextThreatId: number } {
  const base = createInitialState();
  const state = { ...base, ...(partial.state ?? {}) };
  // Defensive: re-clamp allocation in case the save was tampered with.
  state.allocation = {
    harvester: Math.max(0, state.allocation?.harvester ?? 0),
    radiator: Math.max(0, state.allocation?.radiator ?? 0),
    seeker: Math.max(0, state.allocation?.seeker ?? 0),
  };
  state.threats = Array.isArray(state.threats) ? state.threats : [];
  state.upgrades = state.upgrades ?? {};
  return { state, nextThreatId: partial.nextThreatId ?? 1 };
}