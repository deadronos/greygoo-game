/**
 * Game-loop hook.
 *
 * Drives the simulation tick at TICK_MS while the player is in the
 * `play` screen. Pauses during intro / win / lose.
 */

import { useEffect, useRef } from "react";

import { useGameStore, selectScreen } from "@/store/gameStore";
import { TICK_MS } from "@/systems/constants";

export function useGameLoop() {
  const screen = useGameStore(selectScreen);
  const tick = useGameStore((s) => s.tick);
  const handleRef = useRef<number | null>(null);

  useEffect(() => {
    if (screen !== "play") {
      if (handleRef.current !== null) {
        clearInterval(handleRef.current);
        handleRef.current = null;
      }
      document.body.classList.remove("critical-flash");
      return;
    }
    handleRef.current = window.setInterval(tick, TICK_MS);
    return () => {
      if (handleRef.current !== null) {
        clearInterval(handleRef.current);
        handleRef.current = null;
      }
    };
  }, [screen, tick]);
}