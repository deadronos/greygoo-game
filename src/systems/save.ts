/**
 * Persistence layer.
 *
 * localStorage read/write for the game save. Wraps the JSON boundary so
 * the rest of the code doesn't have to think about it.
 */

import { STORAGE_KEY } from "./constants";
import { mergeSave } from "./state";
import type { GameState, SaveData } from "./types";

export function saveGame(state: GameState, nextThreatId: number): void {
  try {
    const data: SaveData = { state: JSON.parse(JSON.stringify(state)), nextThreatId };
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
    const data = JSON.parse(raw) as Partial<SaveData>;
    return mergeSave(data);
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