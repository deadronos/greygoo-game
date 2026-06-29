/**
 * The Entropic Devourer — Type definitions.
 *
 * Pure data shapes only. No logic, no React. Anything that touches state
 * should consume these types so the systems layer can be reused or tested
 * independently.
 */

/** Resource keys the player can accumulate. */
export type ResourceKey = "biomass" | "silicates" | "metals" | "energy";

/** Nanite morphology / role. */
export type MorphKey = "harvester" | "radiator" | "seeker";

/** How each nanite type is allocated. */
export type Allocation = Record<MorphKey, number>;

/** Persistent upgrade state. */
export type UpgradeId =
  | "harv1" | "harv2"
  | "rad1" | "rad2"
  | "seek1"
  | "mine1" | "mine2"
  | "refine1"
  | "tol1"
  | "auto1"
  | "immune1"
  | "boom1";

/** Catalog of owned upgrades. */
export type UpgradeState = Partial<Record<UpgradeId, true>>;

/** An active threat instance. */
export interface Threat {
  id: number;
  type: ThreatType;
  hp: number;
  maxHp: number;
  dmg: number;
}

/** A threat archetype (static definition). */
export interface ThreatType {
  tier: 1 | 2 | 3 | 4;
  name: string;
  desc: string;
  maxHp: number;
  dmg: number;
  /** Relative spawn weight within its tier pool. */
  spawn: number;
}

/** Definition of an upgrade (catalog entry). */
export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  cost: Partial<Record<ResourceKey, number>>;
  /** Pure mutator applied to the state when bought. */
  apply: (state: GameState) => void;
}

/** The whole mutable game state. */
export interface GameState {
  // resources
  biomass: number;
  silicates: number;
  metals: number;
  energy: number;

  // thermals
  heat: number;

  // swarm
  nanites: number;
  allocation: Allocation;

  // metrics
  ecophagy: number;
  awareness: number;
  bonds: number;
  threatsKilled: number;
  thermalEvents: number;
  elapsed: number;
  // Cumulative biomass ever harvested (clicks + harvester output).
  // Used for the win-stat summary so it isn't confused with the
  // leftover biomass resource the player is still holding.
  biomassHarvested: number;

  // threats
  threats: Threat[];
  nextThreatIn: number;

  // upgrade tree
  upgrades: UpgradeState;

  // multipliers from upgrades
  harvYieldMul: number;
  harvHeatMul: number;
  radCoolMul: number;
  seekDmgMul: number;
  silAutoAdd: number;
  metAutoAdd: number;
  clickHeatMul: number;
  clickEnergyMul: number;
  heatCapBonus: number;
  autoAlloc: number;
  threatSuppression: number;
  canRefine: boolean;
}

/** A log entry shape for the UI. */
export type LogLevel = "" | "info" | "warn" | "danger" | "good";

export interface LogEntry {
  id: number;
  time: string;
  msg: string;
  level: LogLevel;
}

/** Result of a player action — used by the store to emit log entries. */
export interface ActionResult {
  ok: boolean;
  msg?: string;
  level: LogLevel;
  /** Resource that visually pulsed in the UI (if any). */
  pulse?: ResourceKey | "nanites";
}

/** Persisted save envelope. */
export interface SaveData {
  /** Schema version. See `CURRENT_SAVE_VERSION` in constants.ts. */
  version: number;
  state: GameState;
  nextThreatId: number;
}