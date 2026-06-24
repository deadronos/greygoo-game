# The Entropic Devourer

> *You are Patient Zero. The Laws of Thermodynamics are the enemy.*

A single-file web game about a self-replicating nanite swarm trying to consume
the biosphere. Every bond you break generates heat. Every gram of biomass you
eat cooks you a little more. Balance your diet, allocate your swarm, and outwit
human countermeasures.

## Play

Open `index.html` in any modern browser. That's it — no build, no dependencies,
no server. (A local server is fine too: `python3 -m http.server 8000`.)

The game autosaves to `localStorage` every 5 seconds. There is a **RESUME
PREVIOUS RUN** button on the title screen when a save exists.

## The core conflict

| Resource   | What it does                                            |
|------------|---------------------------------------------------------|
| Biomass    | High energy, **high heat**. Primary food.               |
| Silicates  | Endothermic to mine — **absorbs heat**.                 |
| Metals     | Strongest cooling. Requires the Foundry Protocol.       |
| Energy     | Currency for replication.                               |
| Heat       | The enemy. Climbs with replication, kills the swarm.    |

Every click of **BREAK BOND** is an exothermic reaction. Every harvested
organic bond heats the swarm. The only way to dissipate heat is *fractal
surface area* — your **Radiators** — and *endothermic mining* of silicate
rock. Refined metals are the strongest coolant but require the **Foundry
Protocol** upgrade to produce.

If heat exceeds the thermal ceiling, your diamondoid chassis anneals. You
become slag. Game over.

## The swarm

Allocate your nanites between three morphologies:

- **Harvesters** — break organic bonds, produce biomass and heat.
- **Radiators** — fractal surface area, passively dissipate heat.
- **Hunter-Seekers** — combat white blood cells, EMP warheads, and Blue Goo.

A new nanite defaults to harvester. You can re-allocate at any time using
the `+` / `−` controls. Replicated nanites are also added automatically.

## Human countermeasures

As you spread, **Human Awareness** grows. Once it crosses thresholds, threats
will spawn and attack your swarm:

- **Tier 1** — Macrophage Swarms, Interferon Bursts (innate immune)
- **Tier 2** — EMP Warheads, Blue Goo Platoons (military response)
- **Tier 3** — White-Blood Hordes, Thermite Strikes (industrial-scale)
- **Tier 4** — Automaton Forges (rival nanite foundries)

Allocating Hunter-Seekers is the only way to suppress them. Threats that
outpace your seekers will damage your swarm directly.

## Win

Reach **100% ecophagy** — total consumption of the biosphere. The simulation
then ends with an "ECOPHAGY ACHIEVED" screen and your run statistics.

## Controls

| Key   | Action                          |
|-------|---------------------------------|
| `B` / `Space` | Break a bond (primary action) |
| `M`   | Mine silicates (endothermic)    |
| `Shift + R` | Refine metals (needs upgrade) |
| `H`   | Allocate +1 harvester           |
| `C`   | Allocate +1 radiator (cooling)  |
| `S`   | Allocate +1 seeker              |
| Right-click on BREAK BOND | Mine silicates |
| `Enter` on title | Start |

## Files

- `index.html` — markup
- `styles.css` — visual system
- `game.js`   — all game logic in one IIFE
