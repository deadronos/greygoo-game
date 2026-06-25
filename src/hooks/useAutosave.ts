/**
 * Autosave hook.
 *
 * Saves the game every AUTOSAVE_MS while the player is in `play`,
 * and once more on `beforeunload`.
 */

import { useEffect } from "react";

import { useGameStore, selectScreen } from "@/store/gameStore";
import { AUTOSAVE_MS } from "@/systems/constants";
import { saveGame } from "@/systems/save";

export function useAutosave() {
  const screen = useGameStore(selectScreen);

  useEffect(() => {
    if (screen !== "play") return;
    // Collect pending flash-revert timers so they can be cleared
    // cleanly on effect teardown instead of leaking across screen
    // swaps.
    const revertTimers = new Set<number>();
    const handle = window.setInterval(() => {
      // Re-read live screen so a win/lose tick that swaps screen
      // between React's commit of this effect cleanup can't fire a
      // zombie save and resurrect a wiped run.
      const { state, nextThreatId, screen: currentScreen } = useGameStore.getState();
      if (currentScreen !== "play") return;
      saveGame(state, nextThreatId);
      // Reflect the autosave in the topbar's flash label so the player
      // sees that persistence is actually happening, then revert to the
      // default after a short delay so the label doesn't go stale.
      const stamp = "autosaved " + new Date().toLocaleTimeString();
      useGameStore.setState({ saveFlash: stamp });
      if (typeof window !== "undefined") {
        const captured = stamp;
        const t = window.setTimeout(() => {
          revertTimers.delete(t);
          if (useGameStore.getState().saveFlash === captured) {
            useGameStore.setState({ saveFlash: "localStorage" });
          }
        }, 4000);
        revertTimers.add(t);
      }
    }, AUTOSAVE_MS);
    const onUnload = () => {
      const { state, nextThreatId, screen: currentScreen } = useGameStore.getState();
      if (currentScreen !== "play") return;
      saveGame(state, nextThreatId);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.clearInterval(handle);
      window.removeEventListener("beforeunload", onUnload);
      for (const t of revertTimers) window.clearTimeout(t);
      revertTimers.clear();
    };
  }, [screen]);
}