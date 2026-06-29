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

      // Help overlay takes precedence over gameplay shortcuts while
      // open, so the only key that does anything is Escape (close).
      const liveStore = useGameStore.getState();
      if (liveStore.helpOpen) {
        if (e.key === "Escape" || e.key === "?") {
          e.preventDefault();
          liveStore.closeHelp();
        }
        return;
      }

      // `?` toggles the help cheatsheet from any play screen. We test
      // for the literal character (Shift+/) so it works regardless of
      // keyboard layout, but bail when the user is typing in a field
      // (e.g. clicking through a future text input).
      if (screen !== "intro" && (e.key === "?" || e.key === "/")) {
        if (!e.shiftKey) return; // bare `/` isn't the binding
        if (!isTypingTarget(e.target)) {
          e.preventDefault();
          liveStore.toggleHelp();
          return;
        }
      }

      // Intro screen: Enter / Space begin a new game.
      if (screen === "intro") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (liveStore.hasSave) liveStore.resumeGame();
          else liveStore.beginNewGame();
        }
        return;
      }
      if (screen !== "play") return;
      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();
      const { state } = liveStore;

      switch (key) {
        case " ":
        case "b":
          liveStore.clickBreakBond();
          e.preventDefault();
          return;
        case "m":
          liveStore.clickMine();
          return;
        case "r":
          if (e.shiftKey) liveStore.clickRefine();
          return;
        case "h":
        case "c":
        case "s": {
          const morph: MorphKey = key === "h" ? "harvester" : key === "c" ? "radiator" : "seeker";
          const total =
            state.allocation.harvester + state.allocation.radiator + state.allocation.seeker;
          // Shift+<morph> pulls one nanite back out of that morph; bare
          // <morph> adds one in (only if there's room). This mirrors the
          // AllocationRow +/- buttons so the keyboard isn't asymmetric.
          if (e.shiftKey) {
            liveStore.changeAlloc(morph, -1);
            return;
          }
          if (state.allocation[morph] < state.nanites && total < state.nanites) {
            liveStore.changeAlloc(morph, 1);
          }
          return;
        }
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [screen]);
}