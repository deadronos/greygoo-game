/**
 * The per-tick simulation.
 *
 * Advance the world by `dt` seconds. Pure mutation on `state`;
 * returns log entries for the UI and the updated `nextThreatId`
 * counter.
 */

import {
  AWARENESS_GROWTH,
  CLICK_ENERGY,
  CLICK_HEAT,
  ECOPHAGY_FROM_BIOMASS,
  ECOPHAGY_GAIN_BASE,
  ENERGY_REGEN_BASE,
  ENERGY_REGEN_PER_RADIATOR,
  HARVESTER_HEAT,
  HARVESTER_OUTPUT,
  HEAT_CRITICAL_FRAC,
  HEAT_DAMAGE_LOG_CHANCE,
  HEAT_DAMAGE_RATE,
  HEAT_PASSIVE_DECAY,
  HEAT_RUNAWAY_FRAC,
  HEAT_WARNING_FRAC,
  METAL_HEAT_ABSORB,
  METAL_REFINE_ENERGY,
  RADIATOR_BASE,
  RADIATOR_COOL,
  REPLICATE_BASE_COST,
  REPLICATE_GROWTH,
  SILICATE_BASELINE_RATE,
  SEEKER_DPS,
  TICK_MS,
} from "./constants";
import { heatCap } from "./state";
import {
  canSpawnThreat,
  resolveThreats,
  rollNextSpawnInterval,
  spawnThreat,
} from "./combat";
import type { ActionResult, GameState, ResourceKey } from "./types";

/**
 * Default per-tick timestep in seconds, used when the caller doesn't
 * supply a measured delta (e.g. unit tests). The game loop passes the
 * real elapsed wall-clock time so background-tab throttling can't
 * silently stall the simulation.
 */
export const DEFAULT_TICK_DT = TICK_MS / 1000;

export interface SimResult {
  results: ActionResult[];
  nextThreatId: number;
}

export function simulate(
  state: GameState,
  nextThreatId: number,
  dt: number = DEFAULT_TICK_DT,
): SimResult {
  state.elapsed += dt;
  const results: ActionResult[] = [];

  // ---- safety: clamp allocation if it exceeds swarm size --------------
  const total =
    state.allocation.harvester +
    state.allocation.radiator +
    state.allocation.seeker;
  if (total > state.nanites) {
    const ratio = state.nanites / total;
    state.allocation.harvester = Math.floor(state.allocation.harvester * ratio);
    state.allocation.radiator = Math.floor(state.allocation.radiator * ratio);
    state.allocation.seeker = Math.floor(state.allocation.seeker * ratio);
  }

  // ---- auto-allocate idle nanites (Automaton Replicator upgrade) -----
  const reTotal =
    state.allocation.harvester +
    state.allocation.radiator +
    state.allocation.seeker;
  const idle = state.nanites - reTotal;
  if (idle > 0 && state.autoAlloc > 0) {
    state.allocation.harvester += Math.min(idle, state.autoAlloc);
  }

  const H = state.allocation.harvester;
  const R = state.allocation.radiator;
  // Seeker allocation is consumed inside resolveThreats().

  // ---- HEAT dynamics ---------------------------------------------------
  const harvHeat = HARVESTER_HEAT * state.harvHeatMul * H;
  const radCool = RADIATOR_COOL * state.radCoolMul * R;
  const baseCool = RADIATOR_BASE * state.nanites;
  const passive = state.heat * HEAT_PASSIVE_DECAY;
  const heatDelta = (harvHeat - radCool - baseCool - passive) * dt;
  state.heat = Math.max(0, state.heat + heatDelta);

  // ---- biomass production --------------------------------------------
  const cap = heatCap(state);
  const warnThreshold = cap * HEAT_WARNING_FRAC;
  const critThreshold = cap * HEAT_CRITICAL_FRAC;
  const runThreshold = cap * HEAT_RUNAWAY_FRAC;
  let efficiency = 1;
  if (state.heat > warnThreshold) efficiency *= 0.7;
  if (state.heat > critThreshold) efficiency *= 0.5;
  if (state.heat > runThreshold) efficiency *= 0.25;
  const biomassProd = HARVESTER_OUTPUT * state.harvYieldMul * H * efficiency;
  state.biomass += biomassProd * dt;
  // Track total biomass ever harvested so the win summary reports
  // cumulative consumption instead of the leftover resource.
  state.biomassHarvested += biomassProd * dt;

  // ---- passive resource trickle --------------------------------------
  state.silicates += state.silAutoAdd * dt;
  state.metals += state.metAutoAdd * dt;
  state.silicates += SILICATE_BASELINE_RATE * dt;

  // ---- auto refining --------------------------------------------------
  if (state.canRefine) {
    const autoRefine = Math.min(
      state.silicates,
      state.energy / METAL_REFINE_ENERGY,
      0.5 * dt,
    );
    if (autoRefine > 0) {
      state.silicates -= autoRefine;
      state.energy -= autoRefine * METAL_REFINE_ENERGY;
      state.metals += autoRefine;
      state.heat = Math.max(0, state.heat - autoRefine * METAL_HEAT_ABSORB);
    }
  }

  // ---- ECOPHAGY ------------------------------------------------------
  const ecoGain =
    (ECOPHAGY_GAIN_BASE * state.nanites + ECOPHAGY_FROM_BIOMASS * biomassProd) * dt;
  state.ecophagy = Math.min(100, state.ecophagy + ecoGain);

  // ---- AWARENESS -----------------------------------------------------
  const threatPressure = state.threats.reduce((a, t) => a + t.type.tier, 0);
  state.awareness = Math.min(
    100,
    state.awareness +
      (state.ecophagy * AWARENESS_GROWTH + threatPressure * 0.02) * dt,
  );

  // ---- THERMAL DAMAGE ------------------------------------------------
  if (state.heat > runThreshold) {
    const dmg = (state.heat - runThreshold) * HEAT_DAMAGE_RATE * dt;
    const loss = Math.min(state.nanites, dmg);
    if (loss > 0) {
      state.nanites = Math.max(0, state.nanites - loss);
      if (Math.random() < HEAT_DAMAGE_LOG_CHANCE) {
        state.thermalEvents += 1;
        results.push({
          ok: false,
          msg: `THERMAL EVENT: ${loss.toFixed(2)} nanites lost to annealing.`,
          level: "danger",
        });
      }
    }
  } else if (state.heat > critThreshold && Math.random() < 0.04) {
    results.push({
      ok: false,
      msg: `Chassis integrity degrading. Heat: ${state.heat.toFixed(1)}`,
      level: "warn",
    });
  }

  // ---- THREATS -------------------------------------------------------
  state.nextThreatIn -= dt;
  if (canSpawnThreat(state)) {
    const t = spawnThreat(state, nextThreatId);
    if (t) {
      nextThreatId += 1;
      results.push({
        ok: false,
        msg: `⚠ THREAT DETECTED: ${t.type.name} (Tier ${t.type.tier})`,
        level: "danger",
      });
      state.nextThreatIn = rollNextSpawnInterval(state);
    }
  }
  results.push(...resolveThreats(state, dt));

  // ---- passive energy regen -----------------------------------------
  state.energy += (R * ENERGY_REGEN_PER_RADIATOR + ENERGY_REGEN_BASE) * dt;

  return { results, nextThreatId };
}

/** Convenience: did the player just win or lose? */
export function checkEndCondition(state: GameState): "won" | "lost" | null {
  if (state.ecophagy >= 100) return "won";
  if (state.nanites <= 0) return "lost";
  return null;
}

/** Computed read-only stats the UI needs each render. */
export interface DerivedStats {
  harvesterBiomassRate: number;
  silicateRate: number;
  metalRate: number;
  replicatorCost: number;
  bondEnergy: number;
  bondHeat: number;
  seekerDps: number;
  coolingRate: number;
  temperatureKelvin: number;
  replicationTier: string;
}

export function derivedStats(state: GameState): DerivedStats {
  const H = state.allocation.harvester;
  const R = state.allocation.radiator;
  const S = state.allocation.seeker;

  const harvesterBiomassRate = HARVESTER_OUTPUT * state.harvYieldMul * H;
  const silicateRate = state.silAutoAdd + SILICATE_BASELINE_RATE;
  const metalRate = state.metAutoAdd + (state.canRefine ? 0.5 : 0);
  const replicatorCost = Math.floor(REPLICATE_BASE_COST + state.nanites * REPLICATE_GROWTH);
  const bondEnergy = CLICK_ENERGY * state.clickEnergyMul;
  const bondHeat = CLICK_HEAT * state.clickHeatMul;
  const seekerDps = SEEKER_DPS * state.seekDmgMul * S;
  const coolingRate =
    RADIATOR_COOL * state.radCoolMul * R +
    RADIATOR_BASE * state.nanites +
    state.heat * HEAT_PASSIVE_DECAY;
  const temperatureKelvin = 298 + state.heat * 4;
  const tier = (() => {
    if (state.nanites < 25) return "I";
    if (state.nanites < 100) return "II";
    if (state.nanites < 500) return "III";
    if (state.nanites < 2500) return "IV";
    return "V";
  })();

  return {
    harvesterBiomassRate,
    silicateRate,
    metalRate,
    replicatorCost,
    bondEnergy,
    bondHeat,
    seekerDps,
    coolingRate,
    temperatureKelvin,
    replicationTier: tier,
  };
}

/** Read-only helper used by render code. */
export function canAffordCost(
  state: GameState,
  cost: Partial<Record<ResourceKey, number>>,
): boolean {
  return (Object.entries(cost) as [ResourceKey, number][]).every(
    ([k, v]) => (state[k] as number) >= v,
  );
}