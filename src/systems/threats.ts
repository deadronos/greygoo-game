/**
 * Threat catalog.
 *
 * Threat archetypes are static. Individual instances are spawned by the
 * combat system and tracked on `GameState.threats`.
 */

import type { ThreatType } from "./types";

export const THREAT_TYPES: ThreatType[] = [
  { tier: 1, name: "MACROPHAGE SWARM",  maxHp: 12,  dmg: 0.15, spawn: 0.30, desc: "Innate immune cells engulfing nanites." },
  { tier: 1, name: "INTERFERON BURST",  maxHp: 8,   dmg: 0.10, spawn: 0.35, desc: "Cytokine signaling disrupting replication." },
  { tier: 2, name: "EMP WARHEAD",       maxHp: 28,  dmg: 0.45, spawn: 0.20, desc: "Directed-energy microwave pulse." },
  { tier: 2, name: "BLUE GOO PLATOON",  maxHp: 38,  dmg: 0.30, spawn: 0.15, desc: "Friendly-fire nanite countermeasure." },
  { tier: 3, name: "WHITE-BLOOD HORDE", maxHp: 70,  dmg: 0.90, spawn: 0.10, desc: "Coordinated leukocyte counter-assault." },
  { tier: 3, name: "THERMITE STRIKE",   maxHp: 55,  dmg: 1.20, spawn: 0.08, desc: "Incendiary ordnance. Heat crisis imminent." },
  { tier: 4, name: "AUTOMATON FORGE",   maxHp: 140, dmg: 1.80, spawn: 0.05, desc: "Rival nanite foundry going critical." },
];