/**
 * Persistence layer.
 *
 * localStorage read/write for the game save. Wraps the JSON boundary so
 * the rest of the code doesn't have to think about it.
 *
 * Saves carry a schema `version` so future state-shape changes can be
 * migrated without forcing players to wipe their run. `migrateSave()`
 * walks `MIGRATIONS` from the saved version up to CURRENT_SAVE_VERSION
 * before handing the payload to `mergeSave()`.
 */

import { CURRENT_SAVE_VERSION, STORAGE_KEY } from "./constants";
import { mergeSave } from "./state";
import type { GameState, SaveData } from "./types";

/**
 * Version bump functions: take the raw decoded payload at version N
 * and return it adapted to version N+1. Each migration is a pure
 * `unknown → unknown` function; no schema awareness required.
 *
 * Currently v1 → v2 is shape-compatible (current payload shape was
 * essentially frozen at v2); we just stamp the version. Add real
 * migrations here when the next structural change happens.
 */
type MigrateFn = (raw: unknown) => unknown;
const MIGRATIONS: Record<number, MigrateFn> = {
  // v1 → v2: validate the payload is an object; otherwise return null
  // so the migration chain halts and loadGame returns null.
  1: (raw) => {
    if (!raw || typeof raw !== "object") return null;
    return raw;
  },
};

function migrateSave(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return null;
  // Legacy saves have no `version` field; treat them as v1.
  let v = (raw as { version?: number }).version;
  if (typeof v !== "number" || !Number.isFinite(v)) v = 1;
  while (v < CURRENT_SAVE_VERSION) {
    const migrator = MIGRATIONS[v];
    if (!migrator) return null;
    raw = migrator(raw);
    if (raw === null) return null;
    v += 1;
  }
  return raw;
}

export function saveGame(state: GameState, nextThreatId: number): void {
  try {
    const data: SaveData = {
      version: CURRENT_SAVE_VERSION,
      state: JSON.parse(JSON.stringify(state)),
      nextThreatId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // Quota exceeded, disabled storage, or circular refs — non-fatal.
    console.error("Save failed:", e);
  }
}

export function loadGame(): { state: GameState; nextThreatId: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const decoded = JSON.parse(raw);
    const migrated = migrateSave(decoded);
    if (migrated === null) return null;
    return mergeSave(migrated as Partial<SaveData>);
  } catch (e) {
    console.error("Load failed:", e);
    return null;
  }
}

export function wipeSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}