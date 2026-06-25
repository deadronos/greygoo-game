/**
 * Boot hook — runs once on mount to detect whether a save exists.
 *
 * Uses `useLayoutEffect` (not `useEffect`) so the localStorage check
 * commits synchronously before paint. Otherwise a user can hit Enter
 * on the intro screen before boot has populated `hasSave`, starting a
 * new game and overwriting an existing save on the next autosave.
 */

import { useLayoutEffect } from "react";

import { useGameStore } from "@/store/gameStore";

export function useBootCheck() {
  useLayoutEffect(() => {
    useGameStore.getState().boot();
  }, []);
}