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
import type { Allocation, GameState, SaveData, Threat } from "./types";

/** Type guard for an individual threat entry in a deserialized save. */
function isValidThreat(t: unknown): t is Threat {
  if (!t || typeof t !== "object") return false;
  const o = t as Record<string, unknown>;
  if (typeof o.id !== "number" || !Number.isFinite(o.id)) return false;
  if (typeof o.hp !== "number" || !Number.isFinite(o.hp)) return false;
  if (typeof o.maxHp !== "number" || !Number.isFinite(o.maxHp)) return false;
  if (typeof o.dmg !== "number" || !Number.isFinite(o.dmg)) return false;
  if (!o.type || typeof o.type !== "object") return false;
  const tt = o.type as Record<string, unknown>;
  return (
    typeof tt.tier === "number"
    && typeof tt.name === "string"
    && typeof tt.desc === "string"
    && typeof tt.maxHp === "number"
    && typeof tt.dmg === "number"
    && typeof tt.spawn === "number"
  );
}

/**
 * Coerce a deserialized value to a finite number, falling back to a
 * baseline if it isn't. Used to defend against tampered saves that
 * would otherwise NaN-propagate through the simulation.
 */
function asFiniteNumber(x: unknown, fallback: number): number {
  return typeof x === "number" && Number.isFinite(x) ? x : fallback;
}

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
  };
}

/** Total thermal ceiling including upgrade bonuses. */
export function heatCap(state: GameState): number {
  return HEAT_CAP_BASE + state.heatCapBonus;
}

/** Merge a save blob onto a fresh state, preserving any new fields. */
export function mergeSave(partial: Partial<SaveData>): { state: GameState; nextThreatId: number } {
  const base = createInitialState();
  const merged: Record<string, unknown> = { ...base, ...(partial.state ?? {}) };
  // Defensive: re-clamp allocation in case the save was tampered with.
  merged.allocation = {
    harvester: Math.max(0, (merged.allocation as Allocation | undefined)?.harvester ?? 0),
    radiator: Math.max(0, (merged.allocation as Allocation | undefined)?.radiator ?? 0),
    seeker: Math.max(0, (merged.allocation as Allocation | undefined)?.seeker ?? 0),
  };
  // Drop malformed threats so a tampered save can't crash the sim.
  merged.threats = Array.isArray(merged.threats)
    ? (merged.threats as unknown[]).filter(isValidThreat)
    : [];
  merged.upgrades = (merged.upgrades as object | null | undefined) ?? {};

  // Validate every numeric field so a tampered save can't NaN-propagate
  // through the simulation and silently break the UI.
  const state: GameState = {
    ...base,
    ...merged,
    biomass:    asFiniteNumber(merged.biomass,    base.biomass),
    silicates:  asFiniteNumber(merged.silicates,  base.silicates),
    metals:     asFiniteNumber(merged.metals,     base.metals),
    energy:     asFiniteNumber(merged.energy,     base.energy),
    heat:       asFiniteNumber(merged.heat,       base.heat),
    nanites:    asFiniteNumber(merged.nanites,    base.nanites),
    ecophagy:   asFiniteNumber(merged.ecophagy,   base.ecophagy),
    awareness:  asFiniteNumber(merged.awareness,  base.awareness),
    bonds:      asFiniteNumber(merged.bonds,      base.bonds),
    threatsKilled:  asFiniteNumber(merged.threatsKilled,  base.threatsKilled),
    thermalEvents:  asFiniteNumber(merged.thermalEvents,  base.thermalEvents),
    elapsed:        asFiniteNumber(merged.elapsed,        base.elapsed),
    nextThreatIn:   asFiniteNumber(merged.nextThreatIn,   base.nextThreatIn),
    harvYieldMul:   asFiniteNumber(merged.harvYieldMul,   1),
    harvHeatMul:    asFiniteNumber(merged.harvHeatMul,    1),
    radCoolMul:     asFiniteNumber(merged.radCoolMul,     1),
    seekDmgMul:     asFiniteNumber(merged.seekDmgMul,     1),
    silAutoAdd:     asFiniteNumber(merged.silAutoAdd,     0),
    metAutoAdd:     asFiniteNumber(merged.metAutoAdd,     0),
    clickHeatMul:   asFiniteNumber(merged.clickHeatMul,   1),
    clickEnergyMul: asFiniteNumber(merged.clickEnergyMul, 1),
    heatCapBonus:   asFiniteNumber(merged.heatCapBonus,   0),
    autoAlloc:      asFiniteNumber(merged.autoAlloc,      0),
    threatSuppression: asFiniteNumber(merged.threatSuppression, 0),
  };

  const id =
    typeof partial.nextThreatId === "number" && Number.isFinite(partial.nextThreatId)
      ? partial.nextThreatId
      : 1;
  return { state, nextThreatId: id };
}