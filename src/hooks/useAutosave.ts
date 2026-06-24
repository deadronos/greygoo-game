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
    const handle = window.setInterval(() => {
      const { state, nextThreatId } = useGameStore.getState();
      saveGame(state, nextThreatId);
    }, AUTOSAVE_MS);
    const onUnload = () => {
      const { state, nextThreatId } = useGameStore.getState();
      saveGame(state, nextThreatId);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.clearInterval(handle);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [screen]);
}