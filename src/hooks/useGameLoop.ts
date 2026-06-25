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
  // Last wall-clock time a tick fired. Real Δt is fed into the
  // simulation so background-tab timer throttling (browsers clamp
  // background intervals to ~1/s) can't make the game silently run
  // in slow motion — and a single late tick won't drop game time.
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (screen !== "play") {
      if (handleRef.current !== null) {
        clearInterval(handleRef.current);
        handleRef.current = null;
      }
      lastRef.current = null;
      document.body.classList.remove("critical-flash");
      return;
    }
    // Reset the delta clock on every play-screen mount so the first
    // tick after resume/unmount doesn't jump by the full interval gap
    // (or by however long the tab was backgrounded).
    lastRef.current = performance.now();
    handleRef.current = window.setInterval(() => {
      const now = performance.now();
      const last = lastRef.current ?? now;
      lastRef.current = now;
      // Clamp big jumps (e.g. resumed after a long stall, or a
      // clock skew) to 1 s so a single tick can't nuke the swarm.
      const dt = Math.min(1, Math.max(0, (now - last) / 1000));
      tick(dt);
    }, TICK_MS);
    return () => {
      if (handleRef.current !== null) {
        clearInterval(handleRef.current);
        handleRef.current = null;
      }
    };
  }, [screen, tick]);
}