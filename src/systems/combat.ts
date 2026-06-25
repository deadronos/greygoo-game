/**
 * Combat / threat system.
 *
 * Pure spawn-and-resolve logic. No React. The store calls these each
 * tick; UI rendering of threat cards lives in components.
 */

import {
  AWARENESS_FIRST_SPAWN,
  SEEKER_DPS,
  THREAT_AWARENESS_FLOOR,
  THREAT_BASE_INTERVAL,
  THREAT_DMG_FRAC,
  THREAT_HARD_CAP,
  THREAT_MAX_TIER_DIVISOR,
  THREAT_MIN_INTERVAL,
  THREAT_SEEKER_PROTECTION_FRAC,
} from "./constants";
import { THREAT_TYPES } from "./threats";
import type { ActionResult, GameState, Threat, ThreatType } from "./types";

/**
 * Pick a threat archetype from the eligible pool, weighted by spawn
 * chance. Returns null if there is nothing eligible.
 */
export function pickThreatType(state: GameState): ThreatType | null {
  if (state.awareness < AWARENESS_FIRST_SPAWN) return null;
  const maxTier = Math.min(4, 1 + Math.floor(state.awareness / THREAT_MAX_TIER_DIVISOR));
  const pool = THREAT_TYPES.filter((t) => t.tier <= maxTier);
  if (pool.length === 0) return null;
  // Normalize against the total weight so Math.random() ∈ [0,1) can
  // reach every entry, even when spawn weights sum to >1.
  const total = pool.reduce((a, t) => a + t.spawn, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (const t of pool) {
    acc += t.spawn;
    if (r < acc) return t;
  }
  return pool[pool.length - 1]!;
}

/** Spawn one threat from the eligible pool. Returns the new threat or null. */
export function spawnThreat(state: GameState, id: number): Threat | null {
  const type = pickThreatType(state);
  if (!type) return null;
  // Skip spawn if the player is already overwhelmed — keeps the
  // per-tick resolveThreats loop, the React threat list, and the
  // autosave JSON.stringify bounded regardless of play style.
  if (state.threats.length >= THREAT_HARD_CAP) return null;
  const scale = 1 + (state.ecophagy / 100) * 2;
  const threat: Threat = {
    id,
    type,
    hp: type.maxHp * scale,
    maxHp: type.maxHp * scale,
    dmg: type.dmg * scale,
  };
  state.threats.push(threat);
  return threat;
}

/**
 * Resolve all threats against seeker DPS for this tick.
 * Returns a list of `ActionResult`s for the log: kills, drops, and a
 * single "too many threats" message if any damage leaked through.
 */
export function resolveThreats(state: GameState, dt: number): ActionResult[] {
  const seekerDmg = SEEKER_DPS * state.seekDmgMul * state.allocation.seeker;
  const results: ActionResult[] = [];

  for (let i = state.threats.length - 1; i >= 0; i--) {
    const t = state.threats[i];
    t.hp -= seekerDmg * dt;
    if (t.hp <= 0) {
      state.threats.splice(i, 1);
      state.threatsKilled += 1;
      // 40% chance to drop a material; otherwise just log the kill
      if (Math.random() < 0.4) {
        const drop = Math.random() < 0.5 ? "biomass" : "silicates";
        const amt = Math.random() < 0.7 ? 1 : 2;
        state[drop] += amt;
        results.push({
          ok: true,
          msg: `Threat neutralized. Recovered ${amt} ${drop}.`,
          level: "good",
          pulse: drop,
        });
      } else {
        results.push({
          ok: true,
          msg: `${t.type.name} neutralized.`,
          level: "good",
        });
      }
      continue;
    }
    // If seekers are outpaced, threats eat nanites. The damage scales
    // linearly from (THREAT_DMG_FRAC * THREAT_SEEKER_PROTECTION_FRAC)
    // of threat DPS at zero seekers down to zero once seekers can match
    // THREAT_DMG_FRAC of the threat's DPS — no knife edge.
    const unmatchedDmg = Math.max(0, t.dmg * THREAT_DMG_FRAC - seekerDmg);
    const dmg = unmatchedDmg * THREAT_SEEKER_PROTECTION_FRAC * dt;
    state.nanites = Math.max(0, state.nanites - dmg);
  }
  return results;
}

/** Roll a new spawn interval after a threat is created. */
export function rollNextSpawnInterval(state: GameState): number {
  const baseInterval = Math.max(
    THREAT_MIN_INTERVAL,
    THREAT_BASE_INTERVAL - state.ecophagy * 0.2,
  );
  const suppression = state.threatSuppression;
  // Enforce the minimum interval AFTER suppression + jitter so the
  // PHAGE COAT upgrade can't push spawns below THREAT_MIN_INTERVAL.
  const interval = baseInterval * (1 - suppression) * (0.7 + Math.random() * 0.6);
  return Math.max(THREAT_MIN_INTERVAL, interval);
}

/** True if the threat scheduler is allowed to spawn right now. */
export function canSpawnThreat(state: GameState): boolean {
  return state.awareness >= THREAT_AWARENESS_FLOOR && state.nextThreatIn <= 0;
}