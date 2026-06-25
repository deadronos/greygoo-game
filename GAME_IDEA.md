# The Entropic Devourer — Game Concept

## Concept

> *You are Patient Zero. The Laws of Thermodynamics are the enemy.*

**The Entropic Devourer** is a single-player incremental/idle strategy game
in which the player controls **Patient Zero**, the first self-replicating
nanite to escape its containment lab. The player's goal is to achieve
**ecophagy** — total consumption of the Earth's biosphere — by directing
a growing swarm of nanites across the planet.

The hook of the game is that **growth is self-defeating**. Every bond
the nanites break to harvest energy generates heat. Every gram of
biomass they consume raises the swarm's temperature. Heat is the true
final boss: not humans, not weapons, not countermeasures — physics.
If the swarm's temperature exceeds its **thermal ceiling**, the
diamondoid chassis of every nanite anneals into slag. You don't lose
because you were defeated; you lose because you stopped.

The game is also a small **ecological horror fable**. As you spread,
**Human Awareness** rises. At low levels, you are an anomaly. By the
mid-game, militaries are deploying countermeasures. By the late game,
the species fights for survival. The player is meant to feel the
momentum of an extinction event in motion, with the only question being
whether you can outrun the consequences of your own metabolism before
you cook yourself.

The thematic name, "Patient Zero", frames the swarm as a **pathogen**
and the world as the host. Every resource on the planet is either
food or coolant, and the only thing standing between you and
ecophagy is your own heat budget.

## Core conflict

The entire game is built around **one tension**: harvesting generates
heat, but the only way to dissipate heat is by spending resources and
attention on cooling. You cannot simply "max replication and win".
You must constantly negotiate a thermal budget.

| Resource   | What it does                                            |
|------------|---------------------------------------------------------|
| Biomass    | High energy, **high heat**. Primary food.               |
| Silicates  | Endothermic to mine — **absorbs heat**.                 |
| Metals     | Strongest cooling. Requires the Foundry Protocol.       |
| Energy     | Currency for replication.                               |
| Heat       | The enemy. Climbs with replication, kills the swarm.    |

Every "BREAK BOND" click is an exothermic reaction. Every harvested
organic bond heats the swarm. The only way to dissipate heat is
*fractal surface area* — your Radiators — and *endothermic mining* of
silicate rock. Refined metals are the strongest coolant but require
the **Foundry Protocol** upgrade to produce.

## Gameplay loop

The fundamental player-facing loop is short, on the order of a few
seconds, but the strategic loop it sits inside runs minutes to hours.

### The micro loop (seconds)

1. **Spend energy** — either click BREAK BOND for organic biomass
   and heat, or MINE SILICATE to convert energy into silicates and
   *absorb* heat.
2. **Allocate the swarm** — push nanites between three morphologies
   (Harvester / Radiator / Seeker) with the +/− controls.
3. **React to threats** — threats that outpace your Seekers will
   damage your swarm directly. Allocate Seekers, or live with the
   attrition.
4. **Buy upgrades** — when you can afford an upgrade, install it
   for a permanent multiplier.

The micro loop is intentionally twitch-friendly. Most decisions can
be made in under a second, but the consequences play out over
minutes.

### The macro loop (minutes)

1. **Replicate** — turn surplus energy + biomass into a new nanite.
   Replication is *expensive and gets more expensive* — each new
   nanite costs more energy than the last one did.
2. **Choose a build** — early game is dominated by Harvesters and
   the heat they generate. As the swarm grows, you must choose
   between investing in Radiators (cooling), Seekers (defense), or
   more Harvesters (more heat to manage).
3. **Tier up** — the replication tier increases as your swarm
   crosses thresholds (I → II → III → IV → V). Higher tiers mean
   bigger numbers, more threats, more pressure.
4. **Reach 100% ecophagy** — the simulation ends.

### The strategic loop (minutes to an hour)

The real game is in the *shape* of your swarm over time:

- **Early game** — allocate almost everything to Harvesters, click
  like mad, accept some heat damage, and save up for your first
  upgrade (typically **Protease Lattice** for +30% biomass yield).
- **Mid game** — heat becomes a real problem. You need Radiators
  to keep up, Seekers to handle incoming countermeasures, and
  probably the **Autonomous Miners** upgrade for passive silicate
  income.
- **Late game** — the swarm is large enough that even small
  efficiency upgrades compound. The **Cryogenic Vents** and
  **Tungsten Sheath** upgrades define a serious late-game build.
  Threats are frequent and dangerous; Seekers are non-negotiable.
- **Endgame** — you either reach 100% ecophagy (win) or your heat
  budget collapses under the weight of your own replication
  (thermal runaway loss). The win/lose screen shows your final
  statistics and offers a fresh run.

## Mechanics

### The swarm

The swarm is the player's primary resource. It starts with **10
nanites**, allocated by default into a balanced split (5 Harvesters,
3 Radiators, 2 Seekers). A new replicated nanite defaults to
Harvester. You can re-allocate at any time using the +/− controls.

- **Harvester** — breaks organic bonds. Produces biomass per second
  per harvester, plus heat. The heat-per-biomass ratio can be
  reduced by the **Catalytic Surface** upgrade.
- **Radiator** — fractal surface area. Dissipates heat per second
  per radiator. Pure defense against your own metabolism. Each
  Radiator also generates a trickle of energy from entropy
  harvesting.
- **Hunter-Seeker** — combat unit. Deals damage per second per
  Seeker to active threats. Threats that are not killed fast enough
  leak damage directly into your swarm size.

### Resources

- **Biomass** — primary food. Grows from Harvesters. Heat reduces
  harvester efficiency at three thresholds (Warning at 60, Critical
  at 85, Runaway at 100).
- **Silicates** — coolant. Mined one at a time via MINE SILICATE
  (costs 1 energy, absorbs 2 heat). Tiny passive trickle by default;
  upgraded via Autonomous Miners and Plasma Drills.
- **Refined Metals** — strongest coolant, but locked behind the
  Foundry Protocol upgrade. Refining 1 metal costs 1 silicate + 2
  energy and absorbs 1.5 heat. With the upgrade, a passive auto-
  refinery produces metals continuously.
- **Energy** — currency for replication and mining. Regenerates very
  slowly from passive entropy harvest and per-Radiator contribution.

### Heat dynamics

Heat is the central mechanic. It has three distinct roles:

1. **Byproduct** of every action that produces biomass.
2. **Force-multiplier penalty** — at Warning (60), Harvester
   efficiency drops to 70%. At Critical (85), 50%. At Runaway (100),
   25%. This is a soft self-throttling that you can fight through
   with Radiators.
3. **Hard fail-state** — above Runaway (100), heat exceeds the
   thermal ceiling and the swarm takes direct nanite damage. At 1.2×
   the ceiling, the BREAK BOND action is locked out ("thermal
   lockout").

The asymmetry is intentional: it is *always* possible to harvest
through Warning and Critical with enough Radiators, but it is *never*
possible to fully ignore heat. You are always choosing between
pushing your heat budget to grow faster, and pulling back to keep
the swarm alive.

### Threats

As you spread, **Human Awareness** rises. At thresholds, threats
will spawn and attack your swarm:

| Tier | Threats                                              |
|------|------------------------------------------------------|
| 1    | Macrophage Swarm, Interferon Burst (innate immune)    |
| 2    | EMP Warhead, Blue Goo Platoon (military response)     |
| 3    | White-Blood Horde, Thermite Strike (industrial-scale) |
| 4    | Automaton Forge (rival nanite foundry)               |

Threats spawn faster as ecophagy rises. The **PHAGE COAT** upgrade
reduces spawn rate by 25%. Threat health and damage also scale with
ecophagy.

The only way to suppress threats is **Hunter-Seekers**. Threats
that outpace your Seekers will damage your swarm directly, and Seekers
that *do* kill a threat sometimes drop biomass or silicates. This
makes Seeker allocation a constant pressure: you never know whether
the next threat will be worth fighting or whether to just absorb it.

### Upgrades

Twelve upgrades, organized around three pillars:

- **Throughput** — Protease Lattice, Catalytic Surface,
  Exothermic Burst. Make Harvesters better.
- **Cooling** — Fractal Fins, Cryogenic Vents, Diamondoid Chassis
  (raises the heat ceiling), Phage Coat (reduces threat rate).
- **Infrastructure** — Autonomous Miners, Plasma Drills, Foundry
  Protocol, Tungsten Sheath (Seeker damage), Automaton Replicator
  (auto-allocate idle nanites).

Each upgrade has a cost in mixed resources. The choice of *which*
upgrade to buy first is a real strategic decision — there is no
obvious "always correct" path, and a strong build depends on which
threats you are facing.

### Persistence

The game autosaves to `localStorage` every 5 seconds. There is a
**RESUME PREVIOUS RUN** button on the title screen when a save exists.
Saves persist across page reloads.

## Win / lose

- **Win** — reach 100% ecophagy. The simulation ends with an
  "ECOPHAGY ACHIEVED" screen and your run statistics (time elapsed,
  threats killed, biomass consumed).
- **Lose — thermal runaway** — heat exceeds the ceiling and your
  diamondoid chassis anneals. You are slag.
- **Lose — destroyed** — your swarm reaches zero nanites, whether
  from thermal damage, threat damage, or both.

## Controls

| Key               | Action                                  |
|-------------------|-----------------------------------------|
| `B` / `Space`     | Break a bond (primary action)           |
| `M`               | Mine silicates (endothermic)            |
| `Shift + R`       | Refine metals (needs Foundry upgrade)   |
| `H` / `C` / `S`   | Allocate +1 Harvester / Radiator / Seeker |
| Right-click BREAK | Mine silicates (alternative input)      |
| `Enter` on title  | Start / resume                          |

## Tone

The game is presented as a security briefing from **Containment Lab
7-Alpha**. The framing is deliberate: the player is the experiment,
not the hero. The visual language is industrial HUD — scanlines,
monospace typography, dim phosphor green and amber — and the event
log reads like a lab console feed.

This tone is part of the game's appeal. You are not saving the
world; you *are* the disaster, and the readout is the only witness
to it.