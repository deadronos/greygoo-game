/**
 * Game store.
 *
 * Wires the pure systems layer (state.ts, actions.ts, simulation.ts,
 * combat.ts, save.ts) to the React tree. Components never touch game
 * logic directly — they call actions and read state via the store.
 *
 * The systems layer mutates state in place for performance, so every
 * store action that mutates state calls `bumpState()` to create a new
 * top-level reference. That keeps Zustand's shallow-equality based
 * subscriber notifications working.
 */

import { create } from "zustand";
import { shallow } from "zustand/shallow";

import {
  breakBond,
  buyUpgrade,
  changeAllocation,
  mineSilicates,
  refineMetals,
  replicateNanite,
} from "@/systems/actions";
import type { ActionOutcome } from "@/systems/actions";
import { LOG_MAX_LINES } from "@/systems/constants";
import { HEAT_LOSE_REASON_FRAC, INITIAL_BIOMASS } from "@/systems/constants";
import { saveGame, loadGame, wipeSave } from "@/systems/save";
import { checkEndCondition, DEFAULT_TICK_DT, derivedStats, simulate } from "@/systems/simulation";
import type { DerivedStats } from "@/systems/simulation";
import { createInitialState, heatCap } from "@/systems/state";
import { fmtTime, nowHMS } from "@/systems/format";
import type {
  Allocation,
  GameState,
  LogEntry,
  LogLevel,
  MorphKey,
  ResourceKey,
  Threat,
  UpgradeState,
} from "@/systems/types";

export type Screen = "intro" | "play" | "win" | "lose";

type PulseKey = ResourceKey | "nanites";

interface PulseEvent {
  id: number;
  key: PulseKey;
}

interface GameStore {
  // ---- raw state ------------------------------------------------------
  state: GameState;
  nextThreatId: number;

  // ---- view state -----------------------------------------------------
  screen: Screen;
  hasSave: boolean;
  log: LogEntry[];
  pulses: PulseEvent[];
  loseReason: string;
  winStats: string;
  loseStats: string;
  saveFlash: string;
  helpOpen: boolean;

  // ---- lifecycle ------------------------------------------------------
  boot: () => void;
  beginNewGame: () => void;
  resumeGame: () => void;
  reset: () => void;
  restart: () => void;
  wipeAndRestart: () => void;

  // ---- player actions -------------------------------------------------
  clickBreakBond: () => void;
  clickMine: () => void;
  clickRefine: () => void;
  clickReplicate: () => void;
  clickUpgrade: (id: string) => void;
  changeAlloc: (morph: MorphKey, delta: number) => void;

  // ---- simulation -----------------------------------------------------
  tick: (dt?: number) => void;

  // ---- helpers --------------------------------------------------------
  forceSave: () => void;
  toggleHelp: () => void;
  closeHelp: () => void;
}

let logIdCounter = 1;
let pulseIdCounter = 1;
const PULSE_TIMEOUT_MS = 240;

// Pending pulse-removal timeouts. Cleared on game lifecycle transitions
// (reset / restart / beginNewGame / resumeGame) so orphaned callbacks
// can't fire setState against a store whose pulses array has been
// wiped.
const pendingPulseTimers = new Set<number>();

function clearPendingPulses(): void {
  if (typeof window === "undefined") return;
  for (const h of pendingPulseTimers) window.clearTimeout(h);
  pendingPulseTimers.clear();
}

/** Reset module-scoped counters when starting a fresh game session. */
function resetIdCounters(): void {
  logIdCounter = 1;
  pulseIdCounter = 1;
}

function pushLog(log: LogEntry[], msg: string, level: LogLevel): LogEntry[] {
  const entry: LogEntry = {
    id: logIdCounter++,
    time: nowHMS(),
    msg,
    level,
  };
  const next = [...log, entry];
  while (next.length > LOG_MAX_LINES) next.shift();
  return next;
}

function pushPulse(
  pulses: PulseEvent[],
  key: PulseKey,
): { pulses: PulseEvent[]; id: number } {
  const id = pulseIdCounter++;
  if (typeof window !== "undefined") {
    const handle = window.setTimeout(() => {
      pendingPulseTimers.delete(handle);
      useGameStore.setState((s) => ({
        pulses: s.pulses.filter((p) => p.id !== id),
      }));
    }, PULSE_TIMEOUT_MS);
    pendingPulseTimers.add(handle);
  }
  return { pulses: [...pulses, { id, key }], id };
}

export const useGameStore = create<GameStore>((set, get) => {
  /**
   * Apply the side effects of an `ActionOutcome`: log it, schedule a
   * visual pulse, and (only if state actually mutated) bump the state
   * reference so subscribers re-render.
   */
  const applyOutcome = (o: ActionOutcome): void => {
    const r = o.result;
    if (!o.mutated && !r.pulse) {
      // Pure log message — no state change, no visual pulse.
      if (r.msg) set((s) => ({ log: pushLog(s.log, r.msg!, r.level) }));
      return;
    }
    set((s) => {
      let log = s.log;
      if (r.msg) log = pushLog(log, r.msg, r.level);
      let pulses = s.pulses;
      if (r.pulse) {
        const out = pushPulse(pulses, r.pulse);
        pulses = out.pulses;
      }
      // Only shallow-copy state if the action actually mutated it.
      const state = o.mutated ? { ...s.state } : s.state;
      return { log, pulses, state };
    });
  };

  return {
    state: createInitialState(),
    nextThreatId: 1,
    screen: "intro",
    hasSave: false,
    log: [],
    pulses: [],
    loseReason: "",
    winStats: "",
    loseStats: "",
    saveFlash: "localStorage",
    helpOpen: false,

    boot: () => {
      const loaded = loadGame();
      set({ hasSave: loaded !== null });
    },

    beginNewGame: () => {
      clearPendingPulses();
      resetIdCounters();
      set({
        state: createInitialState(),
        nextThreatId: 1,
        log: [],
        pulses: [],
        screen: "play",
        helpOpen: false,
      });
      set((s) => {
        let log = s.log;
        log = pushLog(log, "Containment breached. Subject Patient Zero operational.", "danger");
        log = pushLog(log, "Click BREAK BOND to begin harvesting.", "info");
        return { log };
      });
    },

    resumeGame: () => {
      const loaded = loadGame();
      if (!loaded) return;
      clearPendingPulses();
      resetIdCounters();
      set({
        state: loaded.state,
        nextThreatId: loaded.nextThreatId,
        log: [],
        pulses: [],
        screen: "play",
        helpOpen: false,
      });
      set((s) => {
        let log = s.log;
        log = pushLog(log, "Swarm restored from previous session.", "good");
        return { log };
      });
    },

    reset: () => {
      clearPendingPulses();
      resetIdCounters();
      set({
        state: createInitialState(),
        nextThreatId: 1,
        log: [],
        pulses: [],
        screen: "intro",
        loseReason: "",
        winStats: "",
        loseStats: "",
        helpOpen: false,
      });
    },

    restart: () => {
      clearPendingPulses();
      resetIdCounters();
      set({
        state: createInitialState(),
        nextThreatId: 1,
        log: [],
        pulses: [],
        screen: "play",
        loseReason: "",
        winStats: "",
        loseStats: "",
        helpOpen: false,
      });
      set((s) => {
        let log = s.log;
        log = pushLog(log, "Swarm reset. Containment re-established.", "info");
        return { log };
      });
    },

    wipeAndRestart: () => {
      wipeSave();
      set({ hasSave: false });
      get().restart();
    },

    toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
    closeHelp: () => set({ helpOpen: false }),

    clickBreakBond: () => {
      const { state } = get();
      applyOutcome(breakBond(state));
    },

    clickMine: () => {
      const { state } = get();
      applyOutcome(mineSilicates(state));
    },

    clickRefine: () => {
      const { state } = get();
      applyOutcome(refineMetals(state));
    },

    clickReplicate: () => {
      const { state } = get();
      applyOutcome(replicateNanite(state));
    },

    clickUpgrade: (id: string) => {
      const { state } = get();
      const { outcome } = buyUpgrade(state, id);
      applyOutcome(outcome);
    },

    changeAlloc: (morph, delta) => {
      const { state } = get();
      applyOutcome(changeAllocation(state, morph, delta));
    },

    tick: (dt = DEFAULT_TICK_DT) => {
      const { state, nextThreatId, screen } = get();
      if (screen !== "play") return;

      const { results, nextThreatId: nextId } = simulate(state, nextThreatId, dt);

      // Compose all updates in a single `set` call. Pulse events
      // emitted by the simulation (e.g. threat-kill resource drops)
      // are handled here, not just in applyOutcome — player actions
      // already go through that helper.
      set((s) => {
        let log = s.log;
        let pulses = s.pulses;
        for (const r of results) {
          if (r.msg) log = pushLog(log, r.msg, r.level);
          if (r.pulse) {
            const out = pushPulse(pulses, r.pulse);
            pulses = out.pulses;
          }
        }
        return {
          log,
          pulses,
          state: { ...state }, // bump
          nextThreatId: nextId,
        };
      });

      // Win/lose check — handled in a separate set so the screen swap
      // is the only thing that changes.
      const outcome = checkEndCondition(state);
      if (outcome === "won") {
        // Wipe the saved run so a finished game can't be "resumed"
        // straight back into the win screen on next load.
        wipeSave();
        const totalConsumed = Math.max(0, Math.floor(state.biomassHarvested - INITIAL_BIOMASS));
        const winStats =
          `Time ${fmtTime(state.elapsed)}, ${state.threatsKilled} threats killed, ` +
          `biosphere consumed in ${totalConsumed.toLocaleString()} units.`;
        set({ screen: "win", winStats, hasSave: false });
      } else if (outcome === "lost") {
        wipeSave();
        const loseStats =
          `Survived ${fmtTime(state.elapsed)}, ${state.ecophagy.toFixed(2)}% ecophagy, ` +
          `${state.threatsKilled} threats killed.`;
        const loseReason =
          state.heat > heatCap(state) * HEAT_LOSE_REASON_FRAC
            ? "Your diamondoid chassis annealed. You are slag."
            : "Your swarm was destroyed by human countermeasures.";
        set({ screen: "lose", loseStats, loseReason, hasSave: false });
      }
    },

    forceSave: () => {
      const { state, nextThreatId } = get();
      saveGame(state, nextThreatId);
      const stamp = "saved " + new Date().toLocaleTimeString();
      set((s) => {
        let log = s.log;
        log = pushLog(log, "Game saved.", "info");
        return { log, saveFlash: stamp };
      });
      // Restore the default label after a short delay so the topbar
      // doesn't display a stale timestamp forever if no other save runs.
      if (typeof window !== "undefined") {
        const captured = stamp;
        window.setTimeout(() => {
          // Only reset if no newer save has overwritten the stamp.
          if (useGameStore.getState().saveFlash === captured) {
            useGameStore.setState({ saveFlash: "localStorage" });
          }
        }, 4000);
      }
    },
  };
});

// --- selectors ------------------------------------------------------------
// These keep components from subscribing to the entire state object.

export const selectState = (s: GameStore): GameState => s.state;
export const selectScreen = (s: GameStore): Screen => s.screen;
export const selectHasSave = (s: GameStore): boolean => s.hasSave;
export const selectLog = (s: GameStore): LogEntry[] => s.log;
export const selectPulses = (s: GameStore): PulseEvent[] => s.pulses;
export const selectSaveFlash = (s: GameStore): string => s.saveFlash;

// Memoize derived stats by the upstream state ref so identical inputs
// don't allocate a new DerivedStats object every store update.
let _lastDerivedState: GameState | null = null;
let _lastDerived: DerivedStats | null = null;
export const selectDerived = (s: GameStore): DerivedStats => {
  if (s.state !== _lastDerivedState) {
    _lastDerivedState = s.state;
    _lastDerived = derivedStats(s.state);
  }
  return _lastDerived!;
};

// Re-export the shallow comparator so call sites can opt in.
export { shallow };

// --- slice selectors ------------------------------------------------------
// Slice selectors project the game state's relevant fields into a small
// object suitable for subscription via `useGameStore(slice, shallow)`.
// Each call returns a fresh object — shallow equality is what dedupes
// re-renders, so the consumer must pass `shallow` (already exported
// above) at the call site.
//
// Memoizing by the top-level `state` ref would be unsafe here: every
// simulation tick bumps the state ref even when the slice the consumer
// cares about didn't change.

export interface ResourcesSlice {
  biomass: number;
  silicates: number;
  metals: number;
  energy: number;
}
export const selectResources = (s: GameStore): ResourcesSlice => ({
  biomass: s.state.biomass,
  silicates: s.state.silicates,
  metals: s.state.metals,
  energy: s.state.energy,
});

export interface MetricsSlice {
  heat: number;
  nanites: number;
  ecophagy: number;
  awareness: number;
  elapsed: number;
  bonds: number;
  biomassHarvested: number;
}
export const selectMetrics = (s: GameStore): MetricsSlice => ({
  heat: s.state.heat,
  nanites: s.state.nanites,
  ecophagy: s.state.ecophagy,
  awareness: s.state.awareness,
  elapsed: s.state.elapsed,
  bonds: s.state.bonds,
  biomassHarvested: s.state.biomassHarvested,
});

export interface AllocationSlice {
  allocation: Allocation;
  nanites: number;
  autoAlloc: number;
}
export const selectAllocationSlice = (s: GameStore): AllocationSlice => ({
  allocation: s.state.allocation,
  nanites: s.state.nanites,
  autoAlloc: s.state.autoAlloc,
});

export const selectThreats = (s: GameStore): Threat[] => s.state.threats;
export const selectUpgrades = (s: GameStore): UpgradeState => s.state.upgrades;
