# The Entropic Devourer

> *You are Patient Zero. The Laws of Thermodynamics are the enemy.*

A self-replicating nanite swarm simulation. Every bond you break generates
heat. Every gram of biomass you eat cooks you a little more. Balance your
diet, allocate your swarm, and outwit human countermeasures.

## Play

```bash
npm install
npm run dev
```

The dev server opens on `http://localhost:5173`. To produce a static
build: `npm run build`, then `npm run preview` to serve `dist/`.

The game autosaves to `localStorage` every 5 seconds. There is a
**RESUME PREVIOUS RUN** button on the title screen when a save exists.

## The core conflict

| Resource   | What it does                                            |
|------------|---------------------------------------------------------|
| Biomass    | High energy, **high heat**. Primary food.               |
| Silicates  | Endothermic to mine — **absorbs heat**.                 |
| Metals     | Strongest cooling. Requires the Foundry Protocol.       |
| Energy     | Currency for replication.                               |
| Heat       | The enemy. Climbs with replication, kills the swarm.    |

If heat exceeds the thermal ceiling, your diamondoid chassis anneals.
You become slag. Game over.

## The swarm

Allocate your nanites between three morphologies:

- **Harvesters** — break organic bonds, produce biomass and heat.
- **Radiators** — fractal surface area, passively dissipate heat.
- **Hunter-Seekers** — combat white blood cells, EMP warheads, Blue Goo.

A new nanite defaults to harvester. You can re-allocate at any time.

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

## Architecture

The codebase is split into two halves:

### Systems layer — `src/systems/`

Pure game logic, no React, no DOM. Anything in here can be unit-tested
without a browser. Each module owns one concern:

- `constants.ts` — every tuning number lives here.
- `types.ts` — TypeScript shapes (`GameState`, `Threat`, `UpgradeDef`, …).
- `state.ts` — initial-state factory + save merging.
- `upgrades.ts` — declarative upgrade catalog.
- `threats.ts` — threat archetype catalog.
- `actions.ts` — player action handlers (breakBond, mine, refine, …).
- `combat.ts` — threat spawning and resolution.
- `simulation.ts` — the per-tick update.
- `save.ts` — localStorage persistence.
- `format.ts` — number/time formatters.

### UI layer — `src/components/` + `src/hooks/`

Pure presentation. Components read from the Zustand store but never call
game logic directly; the store is the single bridge between the systems
layer and React.

- `panels/` — `Panel`, `Gauge`, `Stat`, `Button` (mini / action / bond).
- `resources/` — `ResourceCard`, `ResourceGrid`.
- `actions/` — `PrimaryAction` (bond button), `SecondaryActions`.
- `allocation/` — `AllocationRow`, `AllocationPanel`.
- `upgrades/` — `UpgradeCard`, `UpgradeList`.
- `threats/` — `ThreatCard`, `ThreatList`.
- `viz/` — `BiosphereViz` (canvas), `VizPanel` (wrapper).
- `log/` — `EventLog`.
- `gauges/` — `Gauges` (heat + ecophagy).
- `telemetry/` — `Telemetry` (stats grid).
- `topbar/` — `TopBar`.
- `overlays/` — `Overlay` base + `IntroOverlay`, `WinOverlay`, `LoseOverlay`.
- `hooks/` — `useGameLoop`, `useAutosave`, `useKeyboardShortcuts`, `useBootCheck`.
- `store/gameStore.ts` — Zustand store that wires the systems layer to the UI.
- `App.tsx` — composes the screen tree, mounts the hooks.
- `main.tsx` — React entry.

Styling: every component has a co-located `.module.css` file. Only
global rules (CSS variables, scanlines, `.hidden`, `.click-burst`,
`.critical-flash`) live in `src/styles/index.css`.

## Files (legacy reference)

The original single-file `game.js` + `styles.css` were replaced by this
rewrite. See `git log` for the history.