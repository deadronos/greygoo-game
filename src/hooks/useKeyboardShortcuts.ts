/**
 * Keyboard shortcuts hook.
 *
 * Wires the global key bindings to store actions.
 */

import { useEffect } from "react";

import { useGameStore, selectScreen } from "@/store/gameStore";
import type { MorphKey } from "@/systems/types";

export function useKeyboardShortcuts() {
  const screen = useGameStore(selectScreen);

  useEffect(() => {
    function isTypingTarget(t: EventTarget | null) {
      if (!(t instanceof HTMLElement)) return false;
      return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
    }

    function onKey(e: KeyboardEvent) {
      // If a <button> is focused, Enter / Space are handled natively by
      // the button's onClick. Bail out so we don't double-fire the
      // binding (e.g. a focused BREAK BOND button firing once via its
      // click and again via this handler, or the intro buttons).
      if (
        (e.key === "Enter" || e.key === " ") &&
        e.target instanceof HTMLButtonElement
      ) {
        return;
      }

      // Intro screen: Enter / Space begin a new game.
      if (screen === "intro") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const store = useGameStore.getState();
          if (store.hasSave) store.resumeGame();
          else store.beginNewGame();
        }
        return;
      }
      if (screen !== "play") return;
      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();
      const store = useGameStore.getState();
      const { state } = store;

      switch (key) {
        case " ":
        case "b":
          store.clickBreakBond();
          e.preventDefault();
          return;
        case "m":
          store.clickMine();
          return;
        case "r":
          if (e.shiftKey) store.clickRefine();
          return;
        case "h":
        case "c":
        case "s": {
          const morph: MorphKey = key === "h" ? "harvester" : key === "c" ? "radiator" : "seeker";
          const total =
            state.allocation.harvester + state.allocation.radiator + state.allocation.seeker;
          if (state.allocation[morph] < state.nanites && total < state.nanites) {
            store.changeAlloc(morph, 1);
          }
          return;
        }
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [screen]);
}