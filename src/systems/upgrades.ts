/**
 * Upgrade catalog.
 *
 * Every upgrade in the game is defined here, declaratively. Buying an
 * upgrade applies a pure mutator to state — no other side effects.
 */

import type { UpgradeDef } from "./types";

export const UPGRADES: UpgradeDef[] = [
  {
    id: "harv1",
    name: "PROTEASE LATTICE",
    desc: "Harvesters +30% biomass yield.",
    cost: { biomass: 25 },
    apply: (s) => { s.harvYieldMul *= 1.30; },
  },
  {
    id: "harv2",
    name: "CATALYTIC SURFACE",
    desc: "Harvesters -25% heat generation.",
    cost: { biomass: 80, silicates: 10 },
    apply: (s) => { s.harvHeatMul *= 0.75; },
  },
  {
    id: "rad1",
    name: "FRACTAL FINS",
    desc: "Radiators +40% cooling.",
    cost: { silicates: 15 },
    apply: (s) => { s.radCoolMul *= 1.40; },
  },
  {
    id: "rad2",
    name: "CRYOGENIC VENTS",
    desc: "Radiators +60% cooling.",
    cost: { silicates: 60, metals: 10 },
    apply: (s) => { s.radCoolMul *= 1.60; },
  },
  {
    id: "seek1",
    name: "TUNGSTEN SHEATH",
    desc: "Seekers deal +50% damage.",
    cost: { metals: 15 },
    apply: (s) => { s.seekDmgMul *= 1.50; },
  },
  {
    id: "mine1",
    name: "AUTONOMOUS MINERS",
    desc: "+0.15 silicates / s baseline.",
    cost: { energy: 30, biomass: 20 },
    apply: (s) => { s.silAutoAdd += 0.15; },
  },
  {
    id: "mine2",
    name: "PLASMA DRILLS",
    desc: "+0.5 silicates / s; +0.2 metals / s.",
    cost: { silicates: 100, metals: 25, energy: 60 },
    apply: (s) => {
      s.silAutoAdd += 0.5;
      s.metAutoAdd += 0.2;
    },
  },
  {
    id: "refine1",
    name: "FOUNDRY PROTOCOL",
    desc: "Unlocks auto-refining of metals.",
    cost: { silicates: 50, biomass: 50, energy: 40 },
    apply: (s) => { s.canRefine = true; },
  },
  {
    id: "tol1",
    name: "DIAMONDOID CHASSIS",
    desc: "Heat ceiling +25.",
    cost: { metals: 30, silicates: 40 },
    apply: (s) => { s.heatCapBonus += 25; },
  },
  {
    id: "auto1",
    name: "AUTOMATON REPLICATOR",
    desc: "Auto-allocate 1 harvester when idle.",
    cost: { energy: 80, biomass: 60 },
    apply: (s) => { s.autoAlloc += 1; },
  },
  {
    id: "immune1",
    name: "PHAGE COAT",
    desc: "Reduces threat spawn rate by 25%.",
    cost: { metals: 40, biomass: 100 },
    apply: (s) => { s.threatSuppression += 0.25; },
  },
  {
    id: "boom1",
    name: "EXOTHERMIC BURST",
    desc: "Click heat -40%, energy +30%.",
    cost: { energy: 120, biomass: 150 },
    apply: (s) => {
      s.clickHeatMul *= 0.6;
      s.clickEnergyMul *= 1.3;
    },
  },
];

export const findUpgrade = (id: string): UpgradeDef | undefined =>
  UPGRADES.find((u) => u.id === id);