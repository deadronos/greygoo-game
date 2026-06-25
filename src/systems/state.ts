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
import { UPGRADES } from "./upgrades";
import type { GameState, MorphKey, SaveData, Threat } from "./types";

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

const NON_NEG = (n: number) => (n < 0 ? 0 : n);
const KNOWN_UPGRADE_IDS = new Set<string>(UPGRADES.map((u) => u.id));

/** Returns true if `x` is a plain object whose values are all `true`. */
function isBoolMap(x: unknown): x is Record<string, true> {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  for (const v of Object.values(x as Record<string, unknown>)) {
    if (v !== true) return false;
  }
  return true;
}

/**
 * Type-safe lookup for an allocation sub-field. Returns NaN for any
 * non-numeric value so the caller can fall back via `asFiniteNumber`.
 */
function readAllocField(
  raw: unknown,
  key: MorphKey,
): number | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const v = (raw as Partial<Record<MorphKey, unknown>>)[key];
  return typeof v === "number" ? v : undefined;
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

  // Defensively re-validate the allocation sub-object. A naive
  // `Math.max(0, "abc")` returns NaN, which then propagates through
  // the simulation; route every key through asFiniteNumber so a
  // tampered save with `"harvester": "abc"` falls back to the initial
  // value instead of producing NaN.
  merged.allocation = {
    harvester: asFiniteNumber(readAllocField(merged.allocation, "harvester"), base.allocation.harvester),
    radiator:  asFiniteNumber(readAllocField(merged.allocation, "radiator"),  base.allocation.radiator),
    seeker:    asFiniteNumber(readAllocField(merged.allocation, "seeker"),    base.allocation.seeker),
  };

  // Drop malformed threats so a tampered save can't crash the sim.
  merged.threats = Array.isArray(merged.threats)
    ? (merged.threats as unknown[]).filter(isValidThreat)
    : [];

  // Upgrades must be a plain object of `{ [id]: true }` entries; a
  // string or other primitive would silently break the "already
  // installed?" check in buyUpgrade and let the player re-purchase.
  // Also restrict to known IDs so old saves with removed upgrades
  // can't keep stale entries around.
  if (!isBoolMap(merged.upgrades)) {
    merged.upgrades = {};
  } else {
    for (const k of Object.keys(merged.upgrades)) {
      if (!KNOWN_UPGRADE_IDS.has(k)) delete (merged.upgrades as Record<string, unknown>)[k];
    }
  }

  // Validate every numeric field so a tampered save can't NaN-propagate
  // through the simulation and silently break the UI. Several fields
  // are semantically non-negative; clamp them so the UI never shows
  // values like "T+-1m 40s" or "-12 threats killed".
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
    bonds:          NON_NEG(asFiniteNumber(merged.bonds,          base.bonds)),
    threatsKilled:  NON_NEG(asFiniteNumber(merged.threatsKilled,  base.threatsKilled)),
    thermalEvents:  NON_NEG(asFiniteNumber(merged.thermalEvents,  base.thermalEvents)),
    elapsed:        NON_NEG(asFiniteNumber(merged.elapsed,        base.elapsed)),
    nextThreatIn:   asFiniteNumber(merged.nextThreatIn,   base.nextThreatIn),
    harvYieldMul:   asFiniteNumber(merged.harvYieldMul,   1),
    harvHeatMul:    asFiniteNumber(merged.harvHeatMul,    1),
    radCoolMul:     asFiniteNumber(merged.radCoolMul,     1),
    seekDmgMul:     asFiniteNumber(merged.seekDmgMul,     1),
    silAutoAdd:     NON_NEG(asFiniteNumber(merged.silAutoAdd,     0)),
    metAutoAdd:     NON_NEG(asFiniteNumber(merged.metAutoAdd,     0)),
    clickHeatMul:   asFiniteNumber(merged.clickHeatMul,   1),
    clickEnergyMul: asFiniteNumber(merged.clickEnergyMul, 1),
    heatCapBonus:   NON_NEG(asFiniteNumber(merged.heatCapBonus,   0)),
    autoAlloc:      NON_NEG(asFiniteNumber(merged.autoAlloc,      0)),
    // threatSuppression is a probability-fraction; clamp to [0, 1].
    threatSuppression: Math.min(1, NON_NEG(asFiniteNumber(merged.threatSuppression, 0))),
  };

  const id =
    typeof partial.nextThreatId === "number" && Number.isFinite(partial.nextThreatId)
      ? partial.nextThreatId
      : 1;
  return { state, nextThreatId: id };
}