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
import type { ActionResult, GameState, MorphKey, ResourceKey } from "./types";

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
  // When damage (thermal/threat) shrinks the swarm below the
  // allocated total, scale all three morphs proportionally back to
  // <= nanites. Math.floor() drops fractional dust, leaving a
  // spurious "idle" remainder that the auto-alloc loop below would
  // otherwise vacuum into harvesters — biasing toward heat
  // generators precisely during a crisis. Restore that dust to the
  // morphs (fractional priority) so allocation sums exactly to the
  // swarm size and the player's intended ratio survives the cut.
  const total =
    state.allocation.harvester +
    state.allocation.radiator +
    state.allocation.seeker;
  if (total > state.nanites) {
    const ratio = state.nanites / total;
    const morphs: MorphKey[] = ["harvester", "radiator", "seeker"];
    const scaled = morphs.map((key) => {
      const value = state.allocation[key] * ratio;
      return { key, value, floor: Math.floor(value), frac: value - Math.floor(value) };
    });
    for (const s of scaled) state.allocation[s.key] = s.floor;
    let leftover = state.nanites - scaled.reduce((a, x) => a + x.floor, 0);
    const byFrac = [...scaled].sort((a, b) => b.frac - a.frac);
    for (let i = 0; leftover > 0 && i < byFrac.length; i++, leftover--) {
      state.allocation[byFrac[i]!.key] += 1;
    }
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
  const efficiency = heatEfficiency(state);
  const biomassProd = HARVESTER_OUTPUT * state.harvYieldMul * H * efficiency;
  // Re-derive the cap-scaled thresholds here (heatEfficiency owns
  // its own copies internally) for the thermal-damage band checks
  // below.
  const cap = heatCap(state);
  const critThreshold = cap * HEAT_CRITICAL_FRAC;
  const runThreshold = cap * HEAT_RUNAWAY_FRAC;
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
    } else {
      // The scheduler was eligible but spawnThreat() declined —
      // either the threat hard cap is full or no archetype is
      // available. Back off with a fresh interval; otherwise
      // nextThreatIn keeps decrementing far below zero and the
      // instant a slot opens a threat spawns with no spacing,
      // defeating rollNextSpawnInterval's 6–30s cadence.
      state.nextThreatIn = rollNextSpawnInterval(state);
    }
  }
  results.push(...resolveThreats(state, dt));

  // ---- passive energy regen -----------------------------------------
  state.energy += (R * ENERGY_REGEN_PER_RADIATOR + ENERGY_REGEN_BASE) * dt;

  return { results, nextThreatId };
}

/**
 * Harvester biomass-efficiency multiplier as a function of heat.
 * Above the warning / critical / runaway thresholds (each expressed
 * as a fraction of the current heat cap) production is progressively
 * throttled. Shared by the simulation and `derivedStats` so the UI's
 * rate readout can't lie about throughput during a heat crisis.
 */
export function heatEfficiency(state: GameState): number {
  const cap = heatCap(state);
  let e = 1;
  if (state.heat > cap * HEAT_WARNING_FRAC)  e *= 0.7;
  if (state.heat > cap * HEAT_CRITICAL_FRAC) e *= 0.5;
  if (state.heat > cap * HEAT_RUNAWAY_FRAC)  e *= 0.25;
  return e;
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

  // Mirror the simulation's heat-throttled biomass output so the
  // ResourceGrid / VizPanel rates don't report full throughput while
  // a heat crisis silently quarters production.
  const harvesterBiomassRate =
    HARVESTER_OUTPUT * state.harvYieldMul * H * heatEfficiency(state);
  const silicateRate = state.silAutoAdd + SILICATE_BASELINE_RATE;
  // Surface the *effective* auto-refine rate, not its ceiling. The
  // simulation caps auto-refine at min(silicates, energy / refine cost,
  // 0.5/s); reporting 0.5/s while starved of silicates or energy
  // would lie about the actual throughput and mask a silent stall.
  const metalRate =
    state.metAutoAdd +
    (state.canRefine
      ? Math.min(0.5, state.silicates, state.energy / METAL_REFINE_ENERGY)
      : 0);
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