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

import {
  breakBond,
  buyUpgrade,
  changeAllocation,
  mineSilicates,
  refineMetals,
  replicateNanite,
} from "@/systems/actions";
import { LOG_MAX_LINES } from "@/systems/constants";
import { saveGame, loadGame, wipeSave } from "@/systems/save";
import { checkEndCondition, derivedStats, simulate } from "@/systems/simulation";
import type { DerivedStats } from "@/systems/simulation";
import { createInitialState, heatCap } from "@/systems/state";
import { nowHMS } from "@/systems/format";
import type {
  ActionResult,
  GameState,
  LogEntry,
  LogLevel,
  MorphKey,
  ResourceKey,
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
  tick: () => void;

  // ---- helpers --------------------------------------------------------
  forceSave: () => void;
}

let logIdCounter = 1;
let pulseIdCounter = 1;
const PULSE_TIMEOUT_MS = 240;

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
    window.setTimeout(() => {
      useGameStore.setState((s) => ({
        pulses: s.pulses.filter((p) => p.id !== id),
      }));
    }, PULSE_TIMEOUT_MS);
  }
  return { pulses: [...pulses, { id, key }], id };
}

export const useGameStore = create<GameStore>((set, get) => {
  /**
   * Apply the side effects of an `ActionResult`: log it, schedule a
   * visual pulse, and bump the state reference.
   */
  const applyResult = (r: ActionResult): void => {
    set((s) => {
      let log = s.log;
      if (r.msg) log = pushLog(log, r.msg, r.level);
      let pulses = s.pulses;
      let state = s.state;
      if (r.pulse) {
        const out = pushPulse(pulses, r.pulse);
        pulses = out.pulses;
      }
      // Always bump — most actions mutate state.
      state = { ...state };
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

    boot: () => {
      const loaded = loadGame();
      set({ hasSave: loaded !== null });
    },

    beginNewGame: () => {
      set({
        state: createInitialState(),
        nextThreatId: 1,
        log: [],
        pulses: [],
        screen: "play",
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
      set({
        state: loaded.state,
        nextThreatId: loaded.nextThreatId,
        log: [],
        pulses: [],
        screen: "play",
      });
      set((s) => {
        let log = s.log;
        log = pushLog(log, "Swarm restored from previous session.", "good");
        return { log };
      });
    },

    reset: () => {
      set({
        state: createInitialState(),
        nextThreatId: 1,
        log: [],
        pulses: [],
        screen: "intro",
        loseReason: "",
        winStats: "",
        loseStats: "",
      });
    },

    restart: () => {
      set({
        state: createInitialState(),
        nextThreatId: 1,
        log: [],
        pulses: [],
        screen: "play",
        loseReason: "",
        winStats: "",
        loseStats: "",
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

    clickBreakBond: () => {
      const { state } = get();
      const r = breakBond(state);
      applyResult(r);
    },

    clickMine: () => {
      const { state } = get();
      applyResult(mineSilicates(state));
    },

    clickRefine: () => {
      const { state } = get();
      applyResult(refineMetals(state));
    },

    clickReplicate: () => {
      const { state } = get();
      applyResult(replicateNanite(state));
    },

    clickUpgrade: (id: string) => {
      const { state } = get();
      const { result } = buyUpgrade(state, id);
      applyResult(result);
    },

    changeAlloc: (morph, delta) => {
      const { state } = get();
      const r = changeAllocation(state, morph, delta);
      if (r.msg) {
        applyResult(r);
      } else {
        // No message but state mutated — still bump.
        set({ state: { ...state } });
      }
    },

    tick: () => {
      const { state, nextThreatId, screen } = get();
      if (screen !== "play") return;

      const { results, nextThreatId: nextId } = simulate(state, nextThreatId);

      // Compose all updates in a single `set` call.
      set((s) => {
        let log = s.log;
        for (const r of results) {
          if (r.msg) log = pushLog(log, r.msg, r.level);
        }
        return {
          log,
          state: { ...state }, // bump
          nextThreatId: nextId,
        };
      });

      // Win/lose check — handled in a separate set so the screen swap
      // is the only thing that changes.
      const outcome = checkEndCondition(state);
      if (outcome === "won") {
        const totalConsumed = Math.floor(state.totalConsumed);
        const winStats =
          `Time ${formatElapsed(state.elapsed)}, ${state.threatsKilled} threats killed, ` +
          `biosphere consumed in ${totalConsumed.toLocaleString()} units.`;
        set({ screen: "win", winStats });
      } else if (outcome === "lost") {
        const loseStats =
          `Survived ${formatElapsed(state.elapsed)}, ${state.ecophagy.toFixed(2)}% ecophagy, ` +
          `${state.threatsKilled} threats killed.`;
        const loseReason =
          state.heat > heatCap(state) * 0.99
            ? "Your diamondoid chassis annealed. You are slag."
            : "Your swarm was destroyed by human countermeasures.";
        set({ screen: "lose", loseStats, loseReason });
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

export const selectDerived = (s: GameStore): DerivedStats => derivedStats(s.state);

// --- helpers --------------------------------------------------------------

function formatElapsed(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h) return `${h}h ${m}m ${ss}s`;
  if (m) return `${m}m ${ss}s`;
  return `${ss}s`;
}