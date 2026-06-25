/**
 * Player-action handlers.
 *
 * Each function takes the state and a mutation surface, mutates state,
 * and returns an `ActionResult` describing what happened (for the log)
 * plus a `mutated` flag so the caller can decide whether to bump the
 * top-level state reference (avoids wasted re-renders on no-op clicks).
 * These are *pure logic* — no React, no logging UI, no audio. The store
 * handles the side effects.
 */

import {
  CLICK_BIOMASS,
  CLICK_ENERGY,
  CLICK_HEAT,
  HEAT_LOCKOUT_MULTIPLIER,
  METAL_HEAT_ABSORB,
  METAL_REFINE_ENERGY,
  METAL_REFINE_SILICATE,
  REPLICATE_BASE_COST,
  REPLICATE_BIOMASS_COST,
  REPLICATE_GROWTH,
  REPLICATE_HEAT_COST,
  SILICATE_HEAT_ABSORB,
  SILICATE_MINE_ENERGY,
} from "./constants";
import { heatCap } from "./state";
import { findUpgrade } from "./upgrades";
import type {
  ActionResult,
  GameState,
  MorphKey,
  UpgradeDef,
  ResourceKey,
} from "./types";

/** Wrapper returned by every action handler. */
export interface ActionOutcome {
  result: ActionResult;
  /** True if the action mutated the underlying state. */
  mutated: boolean;
}

/** "Break Bond" — primary click action. */
export function breakBond(state: GameState): ActionOutcome {
  if (state.heat >= heatCap(state) * HEAT_LOCKOUT_MULTIPLIER) {
    return {
      result: {
        ok: false,
        msg: "Thermal lockout. Chassis too hot to act.",
        level: "warn",
      },
      mutated: false,
    };
  }
  const energyGain = CLICK_ENERGY * state.clickEnergyMul;
  const heatGain = CLICK_HEAT * state.clickHeatMul;
  const biomassGain = CLICK_BIOMASS;

  state.energy += energyGain;
  state.heat += heatGain;
  state.biomass += biomassGain;
  state.bonds += 1;

  return {
    result: {
      ok: true,
      msg: `Bond cleaved. +${energyGain.toFixed(1)}e +${heatGain.toFixed(2)}H +${biomassGain.toFixed(2)}bio`,
      level: "info",
      pulse: "biomass",
    },
    mutated: true,
  };
}

/** Endothermic mining — costs energy, yields silicates, absorbs heat. */
export function mineSilicates(state: GameState): ActionOutcome {
  if (state.energy < SILICATE_MINE_ENERGY) {
    return {
      result: { ok: false, msg: "Insufficient energy to mine silicates.", level: "warn" },
      mutated: false,
    };
  }
  state.energy -= SILICATE_MINE_ENERGY;
  state.silicates += 1;
  state.heat = Math.max(0, state.heat - SILICATE_HEAT_ABSORB);
  return {
    result: {
      ok: true,
      msg: "Endothermic mining — heat absorbed.",
      level: "info",
      pulse: "silicates",
    },
    mutated: true,
  };
}

/** Refine metal — needs the Foundry upgrade. */
export function refineMetals(state: GameState): ActionOutcome {
  if (!state.canRefine) {
    return {
      result: { ok: false, msg: "Refining protocol not yet acquired.", level: "warn" },
      mutated: false,
    };
  }
  if (state.silicates < METAL_REFINE_SILICATE || state.energy < METAL_REFINE_ENERGY) {
    return {
      result: { ok: false, msg: "Need silicates + energy to refine metals.", level: "warn" },
      mutated: false,
    };
  }
  state.silicates -= METAL_REFINE_SILICATE;
  state.energy -= METAL_REFINE_ENERGY;
  state.metals += 1;
  state.heat = Math.max(0, state.heat - METAL_HEAT_ABSORB);
  return {
    result: {
      ok: true,
      msg: "Metal refined. Structural lattice cooled.",
      level: "info",
      pulse: "metals",
    },
    mutated: true,
  };
}

/** Replicate a new nanite. Cost scales with swarm size. */
export function replicateNanite(state: GameState): ActionOutcome {
  const cost = Math.floor(REPLICATE_BASE_COST + state.nanites * REPLICATE_GROWTH);
  if (state.energy < cost) {
    return {
      result: { ok: false, msg: `Need ${cost} energy to replicate.`, level: "warn" },
      mutated: false,
    };
  }
  if (state.biomass < REPLICATE_BIOMASS_COST) {
    return {
      result: { ok: false, msg: `Need ${REPLICATE_BIOMASS_COST} biomass to replicate.`, level: "warn" },
      mutated: false,
    };
  }
  state.energy -= cost;
  state.biomass -= REPLICATE_BIOMASS_COST;
  state.nanites += 1;
  state.heat += REPLICATE_HEAT_COST;
  state.allocation.harvester += 1;
  return {
    result: {
      ok: true,
      msg: `+1 nanite replicated. Cost: ${cost}e + ${REPLICATE_BIOMASS_COST}bio.`,
      level: "good",
      pulse: "nanites",
    },
    mutated: true,
  };
}

/** Shift allocation between morphs. */
export function changeAllocation(
  state: GameState,
  morph: MorphKey,
  delta: number,
): ActionOutcome {
  const current = state.allocation[morph];
  const total =
    state.allocation.harvester +
    state.allocation.radiator +
    state.allocation.seeker;

  if (delta > 0 && total >= state.nanites) {
    return {
      result: { ok: false, msg: "All nanites already allocated.", level: "warn" },
      mutated: false,
    };
  }
  if (delta < 0 && current <= 0) {
    return { result: { ok: true, level: "" }, mutated: false };
  }
  state.allocation[morph] = current + delta;
  return { result: { ok: true, level: "" }, mutated: true };
}

/** Buy an upgrade. Returns an `ActionResult` so the store can log. */
export function buyUpgrade(
  state: GameState,
  upgradeId: string,
): { outcome: ActionOutcome; upgrade?: UpgradeDef } {
  const upgrade = findUpgrade(upgradeId);
  if (!upgrade) {
    return {
      outcome: {
        result: { ok: false, msg: "Unknown upgrade.", level: "warn" },
        mutated: false,
      },
    };
  }
  if (state.upgrades[upgrade.id]) {
    return {
      outcome: {
        result: { ok: false, msg: "Already installed.", level: "warn" },
        mutated: false,
      },
      upgrade,
    };
  }
  for (const [key, value] of Object.entries(upgrade.cost) as [ResourceKey, number][]) {
    if ((state[key] as number) < value) {
      return {
        outcome: {
          result: { ok: false, msg: "Cannot afford upgrade.", level: "warn" },
          mutated: false,
        },
        upgrade,
      };
    }
  }
  for (const [key, value] of Object.entries(upgrade.cost) as [ResourceKey, number][]) {
    (state[key] as number) -= value;
  }
  state.upgrades[upgrade.id] = true;
  upgrade.apply(state);
  return {
    outcome: {
      result: { ok: true, msg: `UPGRADE INSTALLED: ${upgrade.name}`, level: "good" },
      mutated: true,
    },
    upgrade,
  };
}