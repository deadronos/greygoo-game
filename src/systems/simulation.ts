/**
 * The per-tick simulation.
 *
 * `simulate(state, nextThreatId)` advances the world by one tick.
 * Pure mutation on `state`; returns log entries for the UI and the
 * updated `nextThreatId` counter.
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
  HEAT_CRITICAL,
  HEAT_DAMAGE_LOG_CHANCE,
  HEAT_DAMAGE_RATE,
  HEAT_PASSIVE_DECAY,
  HEAT_RUNAWAY,
  HEAT_WARNING,
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
import {
  canSpawnThreat,
  resolveThreats,
  rollNextSpawnInterval,
  spawnThreat,
} from "./combat";
import type { ActionResult, GameState, ResourceKey } from "./types";

export interface SimResult {
  results: ActionResult[];
  nextThreatId: number;
}

export function simulate(state: GameState, nextThreatId: number): SimResult {
  const dt = TICK_MS / 1000;
  state.elapsed += dt;
  const results: ActionResult[] = [];

  // ---- safety: clamp allocation if it exceeds swarm size --------------
  const total =
    state.allocation.harvester +
    state.allocation.radiator +
    state.allocation.seeker;
  if (total > state.nanites) {
    const ratio = state.nanites / total;
    state.allocation.harvester *= ratio;
    state.allocation.radiator *= ratio;
    state.allocation.seeker *= ratio;
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
  const S = state.allocation.seeker;

  // ---- HEAT dynamics ---------------------------------------------------
  const harvHeat = HARVESTER_HEAT * state.harvHeatMul * H;
  const radCool = RADIATOR_COOL * state.radCoolMul * R;
  const baseCool = RADIATOR_BASE * state.nanites;
  const passive = state.heat * HEAT_PASSIVE_DECAY;
  const heatDelta = (harvHeat - radCool - baseCool - passive) * dt;
  state.heat = Math.max(0, state.heat + heatDelta);

  // ---- biomass production --------------------------------------------
  let efficiency = 1;
  if (state.heat > HEAT_WARNING) efficiency *= 0.7;
  if (state.heat > HEAT_CRITICAL) efficiency *= 0.5;
  if (state.heat > HEAT_RUNAWAY) efficiency *= 0.25;
  const biomassProd = HARVESTER_OUTPUT * state.harvYieldMul * H * efficiency;
  state.biomass += biomassProd * dt;
  state.totalConsumed += biomassProd * dt;

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
  if (state.heat > HEAT_RUNAWAY) {
    const dmg = (state.heat - HEAT_RUNAWAY) * HEAT_DAMAGE_RATE * dt;
    const loss = Math.min(state.nanites, dmg);
    state.nanites = Math.max(0, state.nanites - loss);
    state.nanitesLostToHeat += loss;
    if (Math.random() < HEAT_DAMAGE_LOG_CHANCE) {
      state.thermalEvents += 1;
      results.push({
        ok: false,
        msg: `THERMAL EVENT: ${loss.toFixed(2)} nanites lost to annealing.`,
        level: "danger",
      });
    }
  } else if (state.heat > HEAT_CRITICAL && Math.random() < 0.04) {
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
    nextThreatId += 1;
    if (t) {
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

  // Suppress "unused" warning for S — seekerDps is derived from it elsewhere.
  void S;

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