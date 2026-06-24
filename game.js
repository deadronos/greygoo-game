/* =====================================================
   THE ENTROPIC DEVOURER — Game Logic
   ----------------------------------------------------------
   The Laws of Thermodynamics are the real enemy.
   ===================================================== */

(() => {
'use strict';

// =====================================================
// CONSTANTS
// =====================================================
const TICK_MS = 100;                      // simulation tick
const AUTOSAVE_MS = 5000;
const STORAGE_KEY = "entropic_devourer_save_v1";

const HEAT_CAP_BASE   = 100;              // base thermal ceiling
const HEAT_WARNING    = 60;
const HEAT_CRITICAL   = 85;
const HEAT_RUNAWAY    = 100;              // > this damages nanites

const STARTING_NANITES = 10;

const CLICK_ENERGY = 1;
const CLICK_HEAT   = 0.3;
const CLICK_BIOMASS= 0.1;

const HARVESTER_OUTPUT   = 0.6;           // biomass / s / harvester
const HARVESTER_HEAT     = 0.45;          // heat    / s / harvester
const RADIATOR_COOL      = 0.55;          // heat    / s / radiator (drained)
const RADIATOR_BASE      = 0.05;          // baseline passive cooling
const SEEKER_DPS         = 1.0;           // dmg / s / seeker (vs tier-1 threats)

const SILICATE_MINE_ENERGY = 1;           // cost to mine 1 silicate
const SILICATE_HEAT_ABSORB = 2.0;         // heat removed per silicate mined
const SILICATE_AUTO_BASE   = 0;           // passive silicate rate (upgrades)

const METAL_REFINE_SILICATE = 1;
const METAL_REFINE_ENERGY   = 2;
const METAL_HEAT_ABSORB     = 1.5;

const REPLICATE_BASE_COST = 8;            // energy base cost
const REPLICATE_GROWTH    = 1.5;          // per-nanite additive
const REPLICATE_BIOMASS_COST = 2;         // biomass needed per new nanite

const AWARENESS_GROWTH    = 0.018;        // per second, scales with ecophagy
const AWARENESS_DECAY     = 0.05;         // per second when not consuming

const ECOPHAGY_FROM_BIOMASS = 0.05;       // ecophagy per unit of biomass production
const ECOPHAGY_GAIN_BASE    = 0.015;      // baseline passive spread per nanite per sec

// =====================================================
// UPGRADES
// =====================================================
const UPGRADES = [
  { id: "harv1",   name: "PROTEASE LATTICE",     desc: "Harvesters +30% biomass yield.",
    cost: { biomass: 25 },  apply: s => { s.harvYieldMul = (s.harvYieldMul||1) * 1.30; } },
  { id: "harv2",   name: "CATALYTIC SURFACE",    desc: "Harvesters -25% heat generation.",
    cost: { biomass: 80, silicates: 10 }, apply: s => { s.harvHeatMul = (s.harvHeatMul||1) * 0.75; } },
  { id: "rad1",    name: "FRACTAL FINS",         desc: "Radiators +40% cooling.",
    cost: { silicates: 15 }, apply: s => { s.radCoolMul = (s.radCoolMul||1) * 1.40; } },
  { id: "rad2",    name: "CRYOGENIC VENTS",      desc: "Radiators +60% cooling.",
    cost: { silicates: 60, metals: 10 }, apply: s => { s.radCoolMul = (s.radCoolMul||1) * 1.60; } },
  { id: "seek1",   name: "TUNGSTEN SHEATH",      desc: "Seekers deal +50% damage.",
    cost: { metals: 15 }, apply: s => { s.seekDmgMul = (s.seekDmgMul||1) * 1.50; } },
  { id: "mine1",   name: "AUTONOMOUS MINERS",    desc: "+0.15 silicates / s baseline.",
    cost: { energy: 30, biomass: 20 }, apply: s => { s.silAutoAdd = (s.silAutoAdd||0) + 0.15; } },
  { id: "mine2",   name: "PLASMA DRILLS",        desc: "+0.5 silicates / s; +0.2 metals / s.",
    cost: { silicates: 100, metals: 25, energy: 60 }, apply: s => {
      s.silAutoAdd = (s.silAutoAdd||0) + 0.5;
      s.metAutoAdd = (s.metAutoAdd||0) + 0.2;
    }},
  { id: "refine1", name: "FOUNDRY PROTOCOL",     desc: "Unlocks auto-refining of metals.",
    cost: { silicates: 50, biomass: 50, energy: 40 }, apply: s => { s.canRefine = true; } },
  { id: "tol1",    name: "DIAMONDOID CHASSIS",   desc: "Heat ceiling +25.",
    cost: { metals: 30, silicates: 40 }, apply: s => { s.heatCapBonus = (s.heatCapBonus||0) + 25; } },
  { id: "auto1",   name: "AUTOMATON REPLICATOR", desc: "Auto-allocate 1 harvester when idle.",
    cost: { energy: 80, biomass: 60 }, apply: s => { s.autoAlloc = (s.autoAlloc||0) + 1; } },
  { id: "immune1", name: "PHAGE COAT",           desc: "Reduces threat spawn rate by 25%.",
    cost: { metals: 40, biomass: 100 }, apply: s => { s.threatSuppression = (s.threatSuppression||0) + 0.25; } },
  { id: "boom1",   name: "EXOTHERMIC BURST",     desc: "Click heat -40%, energy +30%.",
    cost: { energy: 120, biomass: 150 }, apply: s => {
      s.clickHeatMul = (s.clickHeatMul||1) * 0.6;
      s.clickEnergyMul = (s.clickEnergyMul||1) * 1.3;
    }},
];

// =====================================================
// THREAT DEFINITIONS
// =====================================================
const THREAT_TYPES = [
  { tier: 1, name: "MACROPHAGE SWARM",   maxHp: 12, dmg: 0.15,  spawn: 0.30, desc: "Innate immune cells engulfing nanites." },
  { tier: 1, name: "INTERFERON BURST",   maxHp: 8,  dmg: 0.10,  spawn: 0.35, desc: "Cytokine signaling disrupting replication." },
  { tier: 2, name: "EMP WARHEAD",        maxHp: 28, dmg: 0.45,  spawn: 0.20, desc: "Directed-energy microwave pulse." },
  { tier: 2, name: "BLUE GOO PLATOON",   maxHp: 38, dmg: 0.30,  spawn: 0.15, desc: "Friendly-fire nanite countermeasure." },
  { tier: 3, name: "WHITE-BLOOD HORDE",  maxHp: 70, dmg: 0.90,  spawn: 0.10, desc: "Coordinated leukocyte counter-assault." },
  { tier: 3, name: "THERMITE STRIKE",    maxHp: 55, dmg: 1.20,  spawn: 0.08, desc: "Incendiary ordnance. Heat crisis imminent." },
  { tier: 4, name: "AUTOMATON FORGE",   maxHp: 140, dmg: 1.80, spawn: 0.05, desc: "Rival nanite foundry going critical." },
];

// =====================================================
// STATE
// =====================================================
const defaultState = () => ({
  biomass: 5,
  silicates: 8,
  metals: 0,
  energy: 5,
  heat: 0,
  nanites: STARTING_NANITES,
  allocation: { harvester: 5, radiator: 3, seeker: 2 },
  ecophagy: 0,
  awareness: 0,
  bonds: 0,
  threatsKilled: 0,
  thermalEvents: 0,
  totalConsumed: 0,
  elapsed: 0,
  threats: [],
  upgrades: {},
  // multipliers (from upgrades)
  harvYieldMul: 1, harvHeatMul: 1, radCoolMul: 1, seekDmgMul: 1,
  silAutoAdd: 0, metAutoAdd: 0,
  clickHeatMul: 1, clickEnergyMul: 1,
  heatCapBonus: 0, autoAlloc: 0, threatSuppression: 0,
  canRefine: false,
  // misc
  nextThreatIn: 12,
  nanitesLostToHeat: 0,
});

let state = defaultState();
let nextThreatId = 1;

// =====================================================
// DOM HELPERS
// =====================================================
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const fmt = n => {
  if (n === undefined || n === null || isNaN(n)) return "0";
  if (n === 0) return "0";
  if (Math.abs(n) < 0.01) return n.toExponential(2);
  if (Math.abs(n) < 10)   return n.toFixed(2);
  if (Math.abs(n) < 1000) return n.toFixed(1);
  if (Math.abs(n) < 1e6)  return Math.floor(n).toLocaleString();
  if (Math.abs(n) < 1e9)  return (n/1e6).toFixed(2) + "M";
  if (Math.abs(n) < 1e12) return (n/1e9).toFixed(2) + "B";
  return n.toExponential(2);
};
const fmtInt = n => Math.floor(n).toLocaleString();
const fmtTime = s => {
  s = Math.floor(s);
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
  if (h) return `${h}h ${m}m ${ss}s`;
  if (m) return `${m}m ${ss}s`;
  return `${ss}s`;
};

// =====================================================
// GAME: click handler (the "Break Bond" button)
// =====================================================
function doBreakBond() {
  if (state.heat >= heatCap() * 1.2) {
    log("Thermal lockout. Chassis too hot to act.", "warn");
    flashBond();
    return;
  }
  const energyGain = CLICK_ENERGY * (state.clickEnergyMul || 1);
  const heatGain   = CLICK_HEAT   * (state.clickHeatMul   || 1);
  const biomassGain= CLICK_BIOMASS;
  state.energy  += energyGain;
  state.heat    += heatGain;
  state.biomass += biomassGain;
  state.bonds   += 1;
  spawnClickBurst();
  pulseResource("biomass");
  log(`Bond cleaved. +${energyGain.toFixed(1)}e +${heatGain.toFixed(2)}H +${biomassGain.toFixed(2)}bio`, "info");
}

const bondBtn = () => $("#break-bond");
function flashBond() {
  const b = bondBtn();
  b.classList.add("cooling");
  setTimeout(() => b.classList.remove("cooling"), 600);
}

function spawnClickBurst() {
  const b = bondBtn();
  for (let i = 0; i < 4; i++) {
    const p = document.createElement("div");
    p.className = "click-burst";
    const ang = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 60;
    p.style.setProperty("--tx", `${Math.cos(ang)*dist}px`);
    p.style.setProperty("--ty", `${Math.sin(ang)*dist}px`);
    p.style.left = "50%"; p.style.top = "50%";
    p.style.background = `hsl(${160 + Math.random()*40}, 90%, 65%)`;
    b.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}

function pulseResource(key) {
  const el = document.querySelector(`.res[data-key="${key}"]`);
  if (!el) return;
  el.style.transition = "box-shadow 0.1s";
  el.style.boxShadow = "0 0 20px rgba(88,225,196,0.5)";
  setTimeout(() => { el.style.boxShadow = ""; }, 200);
}

// =====================================================
// GAME: mining & refining
// =====================================================
function mineSilicates() {
  if (state.energy < SILICATE_MINE_ENERGY) {
    log("Insufficient energy to mine silicates.", "warn");
    return;
  }
  state.energy -= SILICATE_MINE_ENERGY;
  state.silicates += 1;
  state.heat = Math.max(0, state.heat - SILICATE_HEAT_ABSORB);
  log("Endothermic mining — heat absorbed.", "info");
  pulseResource("silicates");
}

function refineMetals() {
  if (!state.canRefine) {
    log("Refining protocol not yet acquired.", "warn");
    return;
  }
  if (state.silicates < METAL_REFINE_SILICATE || state.energy < METAL_REFINE_ENERGY) {
    log("Need silicates + energy to refine metals.", "warn");
    return;
  }
  state.silicates -= METAL_REFINE_SILICATE;
  state.energy    -= METAL_REFINE_ENERGY;
  state.metals    += 1;
  state.heat = Math.max(0, state.heat - METAL_HEAT_ABSORB);
  log("Metal refined. Structural lattice cooled.", "info");
  pulseResource("metals");
}

function replicateNanite() {
  const cost = Math.floor(REPLICATE_BASE_COST + state.nanites * REPLICATE_GROWTH);
  if (state.energy < cost) {
    log(`Need ${cost} energy to replicate.`, "warn");
    return false;
  }
  if (state.biomass < REPLICATE_BIOMASS_COST) {
    log(`Need ${REPLICATE_BIOMASS_COST} biomass to replicate.`, "warn");
    return false;
  }
  state.energy  -= cost;
  state.biomass -= REPLICATE_BIOMASS_COST;
  state.nanites += 1;
  state.heat += 0.2;
  state.allocation.harvester += 1; // new nanite defaults to harvester
  log(`+1 nanite replicated. Cost: ${cost}e + ${REPLICATE_BIOMASS_COST}bio.`, "good");
  pulseResource("nanites");
  return true;
}

// =====================================================
// GAME: allocation
// =====================================================
function changeAlloc(morph, delta) {
  const cur = state.allocation[morph];
  const total = state.allocation.harvester + state.allocation.radiator + state.allocation.seeker;
  if (delta > 0 && total >= state.nanites) {
    log("All nanites already allocated.", "warn");
    return;
  }
  if (delta < 0 && cur <= 0) return;
  state.allocation[morph] = cur + delta;
}

// =====================================================
// GAME: threats
// =====================================================
function spawnThreat() {
  if (state.awareness < 8) return;
  // pick tier based on awareness
  const maxTier = Math.min(4, 1 + Math.floor(state.awareness / 25));
  const pool = THREAT_TYPES.filter(t => t.tier <= maxTier);
  const r = Math.random();
  let acc = 0;
  let pick = pool[0];
  for (const t of pool) {
    acc += t.spawn;
    if (r < acc) { pick = t; break; }
  }
  // scale with awareness & ecophagy
  const scale = 1 + (state.ecophagy / 100) * 2;
  const threat = {
    id: nextThreatId++,
    type: pick,
    hp: pick.maxHp * scale,
    maxHp: pick.maxHp * scale,
    dmg: pick.dmg * scale,
  };
  state.threats.push(threat);
  log(`⚠ THREAT DETECTED: ${pick.name} (Tier ${pick.tier})`, "danger");
  renderThreats();
}

function updateThreats(dt) {
  const seekerDmg = SEEKER_DPS * (state.seekDmgMul || 1) * state.allocation.seeker;
  for (let i = state.threats.length - 1; i >= 0; i--) {
    const t = state.threats[i];
    t.hp -= seekerDmg * dt;
    if (t.hp <= 0) {
      state.threats.splice(i, 1);
      state.threatsKilled++;
      // chance to drop materials
      if (Math.random() < 0.4) {
        const drop = Math.random() < 0.5 ? "biomass" : "silicates";
        const amt = Math.random() < 0.7 ? 1 : 2;
        state[drop] += amt;
        log(`Threat neutralized. Recovered ${amt} ${drop}.`, "good");
      } else {
        log(`${t.type.name} neutralized.`, "good");
      }
    } else {
      // If seekers too few, threat actually damages
      if (seekerDmg < t.dmg * 0.5) {
        const dmg = (t.dmg * 0.5 - seekerDmg * 0.05) * dt;
        state.nanites = Math.max(0, state.nanites - dmg);
      }
    }
  }
  renderThreats();
}

// =====================================================
// GAME: per-tick update
// =====================================================
function heatCap() { return HEAT_CAP_BASE + (state.heatCapBonus || 0); }

function tick() {
  const dt = TICK_MS / 1000;
  state.elapsed += dt;
  const total = state.allocation.harvester + state.allocation.radiator + state.allocation.seeker;
  if (total > state.nanites) {
    // safety: clamp
    const ratio = state.nanites / total;
    state.allocation.harvester *= ratio;
    state.allocation.radiator *= ratio;
    state.allocation.seeker *= ratio;
  }

  // auto-alloc idle nanites to harvesters
  const reTotal = state.allocation.harvester + state.allocation.radiator + state.allocation.seeker;
  const idle = state.nanites - reTotal;
  if (idle > 0 && (state.autoAlloc || 0) > 0) {
    const add = Math.min(idle, state.autoAlloc);
    state.allocation.harvester += add;
  }

  const H = state.allocation.harvester;
  const R = state.allocation.radiator;
  const S = state.allocation.seeker;

  // ====== HEAT DYNAMICS ======
  // Harvesters generate heat (less efficient at extreme heat)
  const harvHeat = HARVESTER_HEAT * (state.harvHeatMul || 1) * H;
  // radiators remove heat
  const radCool  = RADIATOR_COOL * (state.radCoolMul || 1) * R;
  // baseline radiative cooling (small)
  const baseCool = RADIATOR_BASE * state.nanites;
  // heat naturally dissipates toward zero
  const passive = state.heat * 0.02;

  const heatDelta = (harvHeat - radCool - baseCool - passive) * dt;
  state.heat = Math.max(0, state.heat + heatDelta);

  // ====== RESOURCE PRODUCTION ======
  // Harvesters → biomass
  // efficiency drops if heat > warning, and crashes > critical
  let eff = 1;
  if (state.heat > HEAT_WARNING)   eff *= 0.7;
  if (state.heat > HEAT_CRITICAL)  eff *= 0.5;
  if (state.heat > HEAT_RUNAWAY)   eff *= 0.25;
  const biomassProd = HARVESTER_OUTPUT * (state.harvYieldMul || 1) * H * eff;
  state.biomass += biomassProd * dt;
  state.totalConsumed += biomassProd * dt;

  // Auto mining
  if (state.silAutoAdd) state.silicates += state.silAutoAdd * dt;
  if (state.metAutoAdd) state.metals    += state.metAutoAdd * dt;
  // baseline very slow silicone tick
  state.silicates += 0.02 * dt;

  // Auto refining (if upgrade bought)
  if (state.canRefine) {
    const autoRefine = Math.min(state.silicates, state.energy / METAL_REFINE_ENERGY, 0.5 * dt);
    if (autoRefine > 0) {
      state.silicates -= autoRefine;
      state.energy    -= autoRefine * METAL_REFINE_ENERGY;
      state.metals    += autoRefine;
      state.heat       = Math.max(0, state.heat - autoRefine * METAL_HEAT_ABSORB);
    }
  }

  // ====== ECOPHAGY ======
  // Spread: scales with nanite count and active biomass production
  const ecoGain = (ECOPHAGY_GAIN_BASE * state.nanites + ECOPHAGY_FROM_BIOMASS * biomassProd) * dt;
  state.ecophagy = Math.min(100, state.ecophagy + ecoGain);

  // ====== AWARENESS ======
  // Grows with ecophagy & active threats
  const threatPressure = state.threats.reduce((a,t) => a + t.type.tier, 0);
  state.awareness = Math.min(100, state.awareness + (state.ecophagy * AWARENESS_GROWTH + threatPressure * 0.02) * dt);

  // ====== THERMAL DAMAGE ======
  if (state.heat > HEAT_RUNAWAY) {
    const dmg = (state.heat - HEAT_RUNAWAY) * 0.05 * dt;
    const loss = Math.min(state.nanites, dmg);
    state.nanites = Math.max(0, state.nanites - loss);
    state.nanitesLostToHeat += loss;
    if (Math.random() < 0.15) {
      state.thermalEvents++;
      log(`THERMAL EVENT: ${loss.toFixed(2)} nanites lost to annealing.`, "danger");
    }
  } else if (state.heat > HEAT_CRITICAL && Math.random() < 0.04) {
    log(`Chassis integrity degrading. Heat: ${state.heat.toFixed(1)}`, "warn");
  }

  // ====== THREATS ======
  // Spawn threats
  state.nextThreatIn -= dt;
  const suppression = state.threatSuppression || 0;
  if (state.nextThreatIn <= 0 && state.awareness > 6) {
    spawnThreat();
    const baseInterval = Math.max(6, 30 - state.ecophagy * 0.2);
    state.nextThreatIn = baseInterval * (1 - suppression) * (0.7 + Math.random() * 0.6);
  }
  updateThreats(dt);

  // ====== PASSIVE ENERGY REGEN ======
  // Energy regenerates very slowly from radiators (entropy harvest)
  state.energy += (R * 0.03 + 0.05) * dt;

  // ====== WIN/LOSE ======
  if (state.ecophagy >= 100) {
    gameOver(true);
  } else if (state.nanites <= 0) {
    gameOver(false);
  }

  render();
}

// =====================================================
// RENDER
// =====================================================
function render() {
  // topbar
  $("#tick-display").textContent = "T+" + fmtTime(state.elapsed);
  $("#ec-status").textContent = `BIOSPHERE ${(100 - state.ecophagy).toFixed(1)}%`;
  const facStatus = state.awareness < 5 ? "CONTAINED" :
                    state.awareness < 30 ? "DETECTED" :
                    state.awareness < 60 ? "RESPONDING" :
                    state.awareness < 85 ? "ENGAGED" : "ALERT";
  $("#facility-status").textContent = facStatus;
  $("#facility-status").style.color = state.awareness < 30 ? "var(--warn)" :
                                     state.awareness < 70 ? "var(--warn)" : "var(--danger)";

  // heat gauge
  const hc = heatCap();
  const heatPct = Math.min(100, (state.heat / hc) * 100);
  $("#heat-fill").style.width = heatPct + "%";
  $("#heat-text").textContent = `${state.heat.toFixed(1)} / ${hc} K*`;
  const heatColor = state.heat < HEAT_WARNING ? "var(--heat-cool)" :
                    state.heat < HEAT_CRITICAL ? "var(--heat-mid)" :
                    state.heat < HEAT_RUNAWAY  ? "var(--heat-hot)" : "var(--heat-melt)";
  $("#heat-fill").style.background = `linear-gradient(90deg, var(--heat-cool), ${heatColor})`;
  $("#heat-hint").textContent =
    state.heat < 30 ? "All systems nominal." :
    state.heat < HEAT_WARNING ? "Heat manageable. Replication efficient." :
    state.heat < HEAT_CRITICAL ? "WARNING: efficiency degrading." :
    state.heat < HEAT_RUNAWAY  ? "CRITICAL: chassis integrity at risk." :
    "MELTDOWN: allocate more radiators!";
  if (state.heat > HEAT_RUNAWAY) $("body").classList.add("critical-flash");
  else $("body").classList.remove("critical-flash");

  // ecophagy gauge
  $("#ecophagy-fill").style.width = state.ecophagy + "%";
  $("#ecophagy-text").textContent = state.ecophagy.toFixed(2) + "%";
  $("#eco-hint").textContent =
    state.ecophagy < 10  ? "The biosphere resists. Spread." :
    state.ecophagy < 30  ? "Local extinction. Press outward." :
    state.ecophagy < 60  ? "Continents darkening. Industrial response imminent." :
    state.ecophagy < 90  ? "Most ecosystems consumed. Few holdouts remain." :
    "Final push. The biosphere is almost silent.";

  // resources
  const H = state.allocation.harvester;
  const R = state.allocation.radiator;
  const S = state.allocation.seeker;
  $("#biomass-value").textContent  = fmt(state.biomass);
  $("#silicates-value").textContent = fmt(state.silicates);
  $("#metals-value").textContent    = fmt(state.metals);
  $("#nanites-value").textContent   = fmtInt(state.nanites);
  $("#biomass-rate").textContent   = `+${(HARVESTER_OUTPUT * (state.harvYieldMul||1) * H).toFixed(2)}/s`;
  $("#silicates-rate").textContent  = `+${((state.silAutoAdd||0) + 0.02).toFixed(2)}/s`;
  $("#metals-rate").textContent     = state.canRefine
    ? `+${((state.metAutoAdd||0) + (state.canRefine ? 0.5 : 0)).toFixed(2)}/s`
    : `locked`;
  $("#nanites-rate").textContent    = state.nanites > H+R+S ? `${state.nanites - (H+R+S)} idle` : "fully alloc.";

  // allocation
  $("#harvester-count").textContent = H;
  $("#radiator-count").textContent  = R;
  $("#seeker-count").textContent    = S;
  $("#harvester-pip").textContent   = `×${H}`;
  $("#radiator-pip").textContent    = `×${R}`;
  $("#seeker-pip").textContent      = `×${S}`;
  const total = H + R + S;
  $("#unallocated").textContent = state.nanites - total;
  $("#total-swarm").textContent = state.nanites;

  // bond button info
  const energyGain = (CLICK_ENERGY * (state.clickEnergyMul || 1)).toFixed(1);
  const heatGain   = (CLICK_HEAT   * (state.clickHeatMul   || 1)).toFixed(2);
  $("#bond-sub").textContent     = `+${energyGain} energy · +${heatGain} heat`;
  $("#bond-energy").textContent  = energyGain;
  $("#bond-heat").textContent    = heatGain;
  $("#bond-biomass").textContent = CLICK_BIOMASS.toFixed(2);

  // upgrades
  renderUpgrades();

  // telemetry
  $("#energy-reserves").textContent = fmt(state.energy);
  $("#total-consumed").textContent  = fmt(state.totalConsumed);
  $("#bonds-broken").textContent    = fmtInt(state.bonds);
  $("#threats-killed").textContent  = fmtInt(state.threatsKilled);
  $("#thermal-events").textContent  = fmtInt(state.thermalEvents);
  const tier = state.nanites < 25 ? "I" : state.nanites < 100 ? "II" :
               state.nanites < 500 ? "III" : state.nanites < 2500 ? "IV" : "V";
  $("#repl-tier").textContent       = tier;

  // viz stats
  $("#threat-count").textContent = state.threats.length;
  $("#seeker-dps").textContent   = (SEEKER_DPS * (state.seekDmgMul||1) * S).toFixed(1);
  $("#cooling-rate").textContent =
    ((RADIATOR_COOL * (state.radCoolMul||1) * R) + RADIATOR_BASE * state.nanites + state.heat * 0.02).toFixed(2) + "/s";
  $("#repl-rate").textContent    = (HARVESTER_OUTPUT * (state.harvYieldMul||1) * H).toFixed(2) + "/s";

  // awareness
  $("#awareness-fill").style.width = state.awareness + "%";
  $("#awareness-hint").textContent =
    state.awareness < 5  ? "Unknown. For now." :
    state.awareness < 20 ? "Local news coverage of strange crop failures." :
    state.awareness < 40 ? "Emergency briefings at major capitals." :
    state.awareness < 60 ? "Global militaries mobilizing countermeasures." :
    state.awareness < 85 ? "Planetary emergency. Blue Goo deployed." :
    "Total war. The species fights for survival.";

  // viz temp readout
  $("#viz-temp").textContent = `${(298 + state.heat * 4).toFixed(0)} K`;
  $("#viz-temp").style.color = state.heat < HEAT_WARNING ? "var(--accent)" :
                               state.heat < HEAT_CRITICAL ? "var(--warn)" :
                               "var(--danger)";

  // action button states
  const mineBtn = $("#mine-sil");
  if (mineBtn) {
    const canMine = state.energy >= SILICATE_MINE_ENERGY;
    mineBtn.disabled = !canMine;
    mineBtn.classList.toggle("unavailable", !canMine);
  }
  const refineBtn = $("#refine-met");
  if (refineBtn) {
    const canRef = state.canRefine &&
                   state.silicates >= METAL_REFINE_SILICATE &&
                   state.energy    >= METAL_REFINE_ENERGY;
    refineBtn.disabled = !canRef;
    refineBtn.classList.toggle("locked", !state.canRefine);
    refineBtn.classList.toggle("unavailable", state.canRefine && !canRef);
  }
  const replBtn = $("#replicate");
  if (replBtn) {
    const replCost = Math.floor(REPLICATE_BASE_COST + state.nanites * REPLICATE_GROWTH);
    const canRepl = state.energy >= replCost && state.biomass >= REPLICATE_BIOMASS_COST;
    replBtn.disabled = !canRepl;
    replBtn.classList.toggle("unavailable", !canRepl);
    const costEl = $("#repl-cost");
    if (costEl) costEl.textContent = `${replCost}e + ${REPLICATE_BIOMASS_COST}bio`;
  }
  const bondBtn = $("#break-bond");
  if (bondBtn) {
    bondBtn.classList.toggle("cooling", state.heat >= heatCap() * 1.2);
  }

  // canvas drawn by separate rAF loop
}

function renderThreats() {
  const el = $("#threat-list");
  if (state.threats.length === 0) {
    el.innerHTML = `<div class="empty-state">No active threats. Stay hungry.</div>`;
    return;
  }
  el.innerHTML = state.threats.map(t => {
    const pct = Math.max(0, (t.hp / t.maxHp) * 100);
    return `<div class="threat">
      <div class="threat-head">
        <span class="threat-name">${t.type.name}</span>
        <span class="threat-tier">TIER ${t.type.tier}</span>
      </div>
      <div class="threat-hp-bar"><div class="threat-hp-fill" style="width:${pct}%"></div></div>
      <div class="threat-desc">${t.type.desc} · ${t.hp.toFixed(0)}/${t.maxHp.toFixed(0)} HP · ${t.dmg.toFixed(2)} dmg/s</div>
    </div>`;
  }).join("");
}

function renderUpgrades() {
  const list = $("#upgrade-list");
  list.innerHTML = "";
  UPGRADES.forEach(u => {
    const owned = !!state.upgrades[u.id];
    const canPay = canAfford(u.cost);
    const div = document.createElement("div");
    div.className = "upgrade" + (owned ? " owned" : (canPay ? "" : " unavailable"));
    const costStr = Object.entries(u.cost)
      .map(([k,v]) => `${v} ${k}`)
      .join(" · ");
    div.innerHTML = `
      <div class="upgrade-info">
        <div class="upgrade-name">${u.name}</div>
        <div class="upgrade-desc">${u.desc}</div>
      </div>
      <div class="upgrade-cost">${owned ? "✓ INSTALLED" : costStr}</div>
    `;
    if (!owned && canPay) {
      div.addEventListener("click", () => buyUpgrade(u));
    }
    list.appendChild(div);
  });
}

function canAfford(cost) {
  for (const [k, v] of Object.entries(cost)) {
    if ((state[k] || 0) < v) return false;
  }
  return true;
}

function buyUpgrade(u) {
  if (state.upgrades[u.id]) return;
  if (!canAfford(u.cost)) return;
  for (const [k, v] of Object.entries(u.cost)) state[k] -= v;
  state.upgrades[u.id] = true;
  u.apply(state);
  log(`UPGRADE INSTALLED: ${u.name}`, "good");
  renderUpgrades();
}

// =====================================================
// LOG
// =====================================================
const LOG_MAX = 80;
function log(msg, level = "") {
  const el = $("#log");
  const line = document.createElement("div");
  line.className = "log-line " + level;
  const t = new Date();
  const time = `${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}:${String(t.getSeconds()).padStart(2,"0")}`;
  line.innerHTML = `<span class="log-time">${time}</span><span class="log-msg">${msg}</span>`;
  el.appendChild(line);
  while (el.children.length > LOG_MAX) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}

// =====================================================
// CANVAS VIZ
// =====================================================
const canvas = () => $("#viz-canvas");
const ctx = () => canvas().getContext("2d");

const vizState = {
  particles: [],
  hexes: [],
  lastDraw: 0,
  pulse: 0,
};

function initViz() {
  const c = canvas();
  c.width = c.clientWidth;
  c.height = c.clientHeight;
  vizState.particles = [];
  for (let i = 0; i < 80; i++) {
    vizState.particles.push({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 1 + Math.random() * 1.5,
    });
  }
  // hex grid
  vizState.hexes = [];
  const size = 22;
  const w = size * Math.sqrt(3);
  const h = size * 1.5;
  for (let row = 0, y = 0; y < c.height + size; row++, y += h) {
    for (let x = (row % 2) * w/2; x < c.width + w; x += w) {
      vizState.hexes.push({ x, y, size, lit: 0, target: 0 });
    }
  }
}

function drawViz() {
  const c = canvas();
  if (c.width !== c.clientWidth || c.height !== c.clientHeight) initViz();
  const g = ctx();
  const W = c.width, H = c.height;
  vizState.pulse += 0.02;
  // background fade
  g.fillStyle = "rgba(4, 8, 12, 0.35)";
  g.fillRect(0, 0, W, H);

  // heat overlay
  const heatFrac = state.heat / heatCap();
  g.fillStyle = `rgba(255, 60, 80, ${heatFrac * 0.18})`;
  g.fillRect(0, 0, W, H);
  // central heat glow
  const grad = g.createRadialGradient(W/2, H/2, 10, W/2, H/2, Math.min(W,H)/2);
  const hot = heatFrac > 0.7;
  grad.addColorStop(0, hot
    ? `rgba(255, 40, 100, ${0.25 + heatFrac * 0.3})`
    : `rgba(88, 225, 196, ${0.10 + Math.sin(vizState.pulse) * 0.05})`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // hex grid (consumed territory)
  const ecoFrac = state.ecophagy / 100;
  for (const hx of vizState.hexes) {
    // distance from center, normalized
    const dx = (hx.x - W/2) / (W/2);
    const dy = (hx.y - H/2) / (H/2);
    const dist = Math.sqrt(dx*dx + dy*dy);
    const lit = dist < ecoFrac * 1.1;
    hx.target = lit ? 1 : 0;
    hx.lit += (hx.target - hx.lit) * 0.05;
    if (hx.lit < 0.01) continue;
    drawHex(g, hx.x, hx.y, hx.size, hx.lit, heatFrac);
  }

  // nanite particles
  g.fillStyle = hot ? "#ff5a78" : "#58e1c4";
  for (const p of vizState.particles) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = W;
    if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H;
    if (p.y > H) p.y = 0;
    g.globalAlpha = 0.7;
    g.beginPath();
    g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  // threats (pulsing red)
  for (const t of state.threats) {
    // pseudo-position based on id
    const seed = t.id * 1234.5678;
    const tx = W * 0.15 + ((Math.sin(seed) + 1) / 2) * W * 0.7;
    const ty = H * 0.15 + ((Math.cos(seed * 1.3) + 1) / 2) * H * 0.7;
    const sz = 12 + t.type.tier * 5;
    const pulseR = sz + Math.sin(vizState.pulse * 4 + t.id) * 4;
    g.strokeStyle = "rgba(255,77,94,0.8)";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(tx, ty, pulseR, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "rgba(255,77,94,0.25)";
    g.fill();
    g.fillStyle = "#ff4d5e";
    g.font = "bold 10px monospace";
    g.textAlign = "center";
    g.fillText(t.type.tier.toString(), tx, ty + 3);
  }
  g.textAlign = "start";

  // biosphere outline
  g.strokeStyle = "rgba(88, 225, 196, 0.3)";
  g.lineWidth = 1;
  g.beginPath();
  g.arc(W/2, H/2, Math.min(W,H) * 0.45, 0, Math.PI*2);
  g.stroke();
}

function drawHex(g, x, y, s, lit, heatFrac) {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI/6;
    const px = x + s * Math.cos(a);
    const py = y + s * Math.sin(a);
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  if (lit > 0.01) {
    const a = 0.2 + lit * 0.3;
    const color = heatFrac > 0.5
      ? `rgba(255, ${Math.floor(140 - heatFrac*100)}, 60, ${a})`
      : `rgba(123, 214, 106, ${a})`;
    g.fillStyle = color;
    g.fill();
    g.strokeStyle = `rgba(123, 214, 106, ${a * 1.2})`;
    g.lineWidth = 1;
    g.stroke();
  } else {
    g.strokeStyle = "rgba(88, 225, 196, 0.05)";
    g.lineWidth = 0.5;
    g.stroke();
  }
}

// =====================================================
// WIN/LOSE
// =====================================================
function gameOver(won) {
  if ($("#game").classList.contains("hidden")) return;
  stopLoop();
  if (won) {
    $("#win-stats").textContent =
      `Time ${fmtTime(state.elapsed)}, ${state.threatsKilled} threats killed, ` +
      `biosphere consumed in ${fmt(state.totalConsumed)} units.`;
    $("#win-overlay").classList.remove("hidden");
  } else {
    $("#lose-stats").textContent =
      `Survived ${fmtTime(state.elapsed)}, ${(state.ecophagy).toFixed(2)}% ecophagy, ` +
      `${state.threatsKilled} threats killed.`;
    $("#lose-reason").textContent =
      state.heat > HEAT_RUNAWAY
        ? "Your diamondoid chassis annealed. You are slag."
        : "Your swarm was destroyed by human countermeasures.";
    $("#lose-overlay").classList.remove("hidden");
  }
}

// =====================================================
// SAVE / LOAD
// =====================================================
function save() {
  try {
    const data = JSON.parse(JSON.stringify(state));
    data.nextThreatId = nextThreatId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    $("#save-status").textContent = "saved " + new Date().toLocaleTimeString();
  } catch (e) {
    console.error("Save failed:", e);
  }
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    Object.assign(state, defaultState(), data);
    nextThreatId = data.nextThreatId || 1;
    return true;
  } catch (e) {
    console.error("Load failed:", e);
    return false;
  }
}
function wipeAll() {
  if (!confirm("Wipe the swarm and start over? This deletes your save.")) return;
  fullReset();
}
function fullReset() {
  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
  nextThreatId = 1;
  $("#log").innerHTML = "";
  log("Swarm reset. Containment re-established.", "info");
  $("#win-overlay").classList.add("hidden");
  $("#lose-overlay").classList.add("hidden");
  initViz();
  startLoop();
  render();
}

// =====================================================
// LOOP
// =====================================================
let tickHandle = null;
let drawHandle = null;
function startLoop() {
  stopLoop();
  tickHandle = setInterval(tick, TICK_MS);
  drawHandle = requestAnimationFrame(drawLoop);
  setInterval(save, AUTOSAVE_MS);
}
function stopLoop() {
  if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
  if (drawHandle) { cancelAnimationFrame(drawHandle); drawHandle = null; }
}
function drawLoop() {
  drawViz();
  drawHandle = requestAnimationFrame(drawLoop);
}

// =====================================================
// EVENT WIRING
// =====================================================
function wireEvents() {
  $("#begin-btn").addEventListener("click", () => {
    $("#intro-overlay").classList.add("hidden");
    $("#game").classList.remove("hidden");
    initViz();
    startLoop();
    log("Containment breached. Subject Patient Zero operational.", "danger");
    log("Click BREAK BOND to begin harvesting.", "info");
  });
  $("#continue-btn").addEventListener("click", () => {
    if (load()) {
      $("#intro-overlay").classList.add("hidden");
      $("#game").classList.remove("hidden");
      initViz();
      startLoop();
      log("Swarm restored from previous session.", "good");
    }
  });
  $("#break-bond").addEventListener("click", doBreakBond);
  $("#mine-sil").addEventListener("click", mineSilicates);
  $("#refine-met").addEventListener("click", refineMetals);
  $("#replicate").addEventListener("click", replicateNanite);
  $("#save-btn").addEventListener("click", () => { save(); log("Game saved.", "info"); });
  $("#reset-btn").addEventListener("click", wipeAll);
  $("#win-restart").addEventListener("click", () => {
    $("#win-overlay").classList.add("hidden");
    fullReset();
  });
  $("#lose-restart").addEventListener("click", () => {
    $("#lose-overlay").classList.add("hidden");
    fullReset();
  });

  // allocation buttons
  $$(".alloc-ctrls button").forEach(btn => {
    btn.addEventListener("click", () => {
      const morph = btn.dataset.morph;
      const delta = parseInt(btn.dataset.delta, 10);
      changeAlloc(morph, delta);
    });
  });

  // right-click on bond button = mine silicates
  $("#break-bond").addEventListener("contextmenu", e => {
    e.preventDefault();
    mineSilicates();
  });

  // keyboard shortcuts
  document.addEventListener("keydown", e => {
    if ($("#intro-overlay") && !$("#intro-overlay").classList.contains("hidden")) {
      if (e.key === "Enter" || e.key === " ") {
        $("#begin-btn").click();
        e.preventDefault();
      }
      return;
    }
    if (e.target.tagName === "INPUT") return;
    switch (e.key.toLowerCase()) {
      case " ": case "b": doBreakBond(); e.preventDefault(); break;
      case "m": mineSilicates(); break;
      case "r": if (e.shiftKey) refineMetals(); break;
      case "h":
        if (state.allocation.harvester < state.nanites &&
            state.allocation.harvester + state.allocation.radiator + state.allocation.seeker < state.nanites) {
          changeAlloc("harvester", 1);
        }
        break;
      case "c":
        if (state.allocation.radiator < state.nanites &&
            state.allocation.harvester + state.allocation.radiator + state.allocation.seeker < state.nanites) {
          changeAlloc("radiator", 1);
        }
        break;
      case "s":
        if (state.allocation.seeker < state.nanites &&
            state.allocation.harvester + state.allocation.radiator + state.allocation.seeker < state.nanites) {
          changeAlloc("seeker", 1);
        }
        break;
    }
  });

  window.addEventListener("resize", () => initViz());

  // beforeunload save
  window.addEventListener("beforeunload", save);
}

// =====================================================
// BOOT
// =====================================================
function boot() {
  // check for existing save
  if (load()) {
    $("#continue-btn").classList.remove("hidden");
  }
  wireEvents();
  // initial render of any static UI
  render();
}

document.addEventListener("DOMContentLoaded", boot);

})();
