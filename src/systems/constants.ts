/**
 * The Entropic Devourer — Tuning constants.
 *
 * Every magic number in the game lives here. Changing balance is a
 * single-file diff.
 */

import type { LogLevel } from "./types";

// --- Loops & timing -------------------------------------------------------
export const TICK_MS = 100;
export const AUTOSAVE_MS = 5_000;
export const STORAGE_KEY = "entropic_devourer_save_v2";

// --- Heat thresholds ------------------------------------------------------
export const HEAT_CAP_BASE = 100;
export const HEAT_WARNING = 60;
export const HEAT_CRITICAL = 85;
export const HEAT_RUNAWAY = 100;

// --- Starting conditions --------------------------------------------------
export const STARTING_NANITES = 10;

// --- Click "Break Bond" ---------------------------------------------------
export const CLICK_ENERGY = 1;
export const CLICK_HEAT = 0.3;
export const CLICK_BIOMASS = 0.1;

// --- Per-morph rates ------------------------------------------------------
export const HARVESTER_OUTPUT = 0.6;   // biomass / s / harvester
export const HARVESTER_HEAT = 0.45;    // heat    / s / harvester
export const RADIATOR_COOL = 0.55;     // heat    / s / radiator (drained)
export const RADIATOR_BASE = 0.05;     // baseline passive cooling per nanite
export const SEEKER_DPS = 1.0;         // dmg / s / seeker (vs tier-1 threats)

// --- Mining / refining ----------------------------------------------------
export const SILICATE_MINE_ENERGY = 1;
export const SILICATE_HEAT_ABSORB = 2.0;
export const METAL_REFINE_SILICATE = 1;
export const METAL_REFINE_ENERGY = 2;
export const METAL_HEAT_ABSORB = 1.5;

// --- Replication ----------------------------------------------------------
export const REPLICATE_BASE_COST = 8;
export const REPLICATE_GROWTH = 1.5;
export const REPLICATE_BIOMASS_COST = 2;

// --- Awareness / ecophagy -------------------------------------------------
export const AWARENESS_GROWTH = 0.018;
export const ECOPHAGY_FROM_BIOMASS = 0.05;
export const ECOPHAGY_GAIN_BASE = 0.015;

// --- Heat lockout (chassis too hot to act) --------------------------------
export const HEAT_LOCKOUT_MULTIPLIER = 1.2;

// --- Thermal damage formula ----------------------------------------------
export const HEAT_DAMAGE_RATE = 0.05;
export const HEAT_DAMAGE_LOG_CHANCE = 0.15;

// --- Cooling dissipation (exponential decay toward 0) ---------------------
export const HEAT_PASSIVE_DECAY = 0.02;

// --- Baseline passive silicate trickle ------------------------------------
export const SILICATE_BASELINE_RATE = 0.02;

// --- Passive entropy-energy regen -----------------------------------------
export const ENERGY_REGEN_BASE = 0.05;
export const ENERGY_REGEN_PER_RADIATOR = 0.03;

// --- Threat spawning ------------------------------------------------------
export const AWARENESS_FIRST_SPAWN = 8;
export const THREAT_BASE_INTERVAL = 30;
export const THREAT_MIN_INTERVAL = 6;
export const THREAT_AWARENESS_FLOOR = 6;
export const THREAT_MAX_TIER_DIVISOR = 25;

// --- Auto-allocate from idle nanites --------------------------------------
export const REPLICATE_HEAT_COST = 0.2;

// --- Log buffer ------------------------------------------------------------
export const LOG_MAX_LINES = 80;

/** Render-side derived thresholds the UI cares about. */
export const AWARENESS_LABELS: { max: number; label: string; color: string }[] = [
  { max: 5,   label: "CONTAINED",   color: "var(--warn)" },
  { max: 30,  label: "DETECTED",    color: "var(--warn)" },
  { max: 60,  label: "RESPONDING",  color: "var(--warn)" },
  { max: 85,  label: "ENGAGED",     color: "var(--danger)" },
  { max: 101, label: "ALERT",       color: "var(--danger)" },
];

export const HEAT_HINT_BANDS: { max: number; msg: string }[] = [
  { max: 30,                   msg: "All systems nominal." },
  { max: HEAT_WARNING,         msg: "Heat manageable. Replication efficient." },
  { max: HEAT_CRITICAL,        msg: "WARNING: efficiency degrading." },
  { max: HEAT_RUNAWAY,         msg: "CRITICAL: chassis integrity at risk." },
  { max: Infinity,             msg: "MELTDOWN: allocate more radiators!" },
];

export const ECO_HINT_BANDS: { max: number; msg: string }[] = [
  { max: 10,  msg: "The biosphere resists. Spread." },
  { max: 30,  msg: "Local extinction. Press outward." },
  { max: 60,  msg: "Continents darkening. Industrial response imminent." },
  { max: 90,  msg: "Most ecosystems consumed. Few holdouts remain." },
  { max: 101, msg: "Final push. The biosphere is almost silent." },
];

export const AWARENESS_HINT_BANDS: { max: number; msg: string }[] = [
  { max: 5,   msg: "Unknown. For now." },
  { max: 20,  msg: "Local news coverage of strange crop failures." },
  { max: 40,  msg: "Emergency briefings at major capitals." },
  { max: 60,  msg: "Global militaries mobilizing countermeasures." },
  { max: 85,  msg: "Planetary emergency. Blue Goo deployed." },
  { max: 101, msg: "Total war. The species fights for survival." },
];

export const REPLICATION_TIERS: { max: number; label: string }[] = [
  { max: 25,    label: "I"   },
  { max: 100,   label: "II"  },
  { max: 500,   label: "III" },
  { max: 2500,  label: "IV"  },
  { max: Infinity, label: "V" },
];

export const DEFAULT_LOG_LEVEL: LogLevel = "";