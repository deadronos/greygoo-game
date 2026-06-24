/**
 * Boot hook — runs once on mount to detect whether a save exists.
 */

import { useEffect } from "react";

import { useGameStore } from "@/store/gameStore";

export function useBootCheck() {
  useEffect(() => {
    useGameStore.getState().boot();
  }, []);
}