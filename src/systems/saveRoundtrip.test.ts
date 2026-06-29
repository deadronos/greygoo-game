import { describe, expect, it } from "vitest";
import { CURRENT_SAVE_VERSION } from "./constants";
import { createInitialState } from "./state";
import { loadGame, saveGame } from "./save";

const STORAGE_KEY = "entropic_devourer_save";

describe("save round-trip", () => {
  it("saves and loads state on the current version", () => {
    if (typeof localStorage === "undefined") throw new Error("ls unavail");
    localStorage.clear();
    const s = createInitialState();
    s.biomass = 1234;
    s.nanites = 42;
    saveGame(s, 99);
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    if (!loaded) return;
    expect(loaded.state.biomass).toBe(1234);
    expect(loaded.state.nanites).toBe(42);
    expect(loaded.nextThreatId).toBe(99);
  });

  it("embeds the schema version in the saved payload", () => {
    if (typeof localStorage === "undefined") throw new Error("ls unavail");
    localStorage.clear();
    saveGame(createInitialState(), 1);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
    expect(raw.version).toBe(CURRENT_SAVE_VERSION);
  });

  it("uses the canonical storage key", () => {
    if (typeof localStorage === "undefined") throw new Error("ls unavail");
    localStorage.clear();
    saveGame(createInitialState(), 1);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem("entropic_devourer_save_v2")).toBeNull();
  });

  it("round-trips biomassHarvested", () => {
    if (typeof localStorage === "undefined") throw new Error("ls unavail");
    localStorage.clear();
    const s = createInitialState();
    s.biomassHarvested = 9999;
    saveGame(s, 1);
    const loaded = loadGame();
    if (!loaded) throw new Error("not loaded");
    expect(loaded.state.biomassHarvested).toBe(9999);
  });
});

describe("version migration", () => {
  it("imports a legacy v1 save", () => {
    if (typeof localStorage === "undefined") throw new Error("ls unavail");
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      state: { biomass: 5, silicates: 8, metals: 0, energy: 5, heat: 0, nanites: 10,
        allocation: { harvester: 5, radiator: 3, seeker: 2 }, ecophagy: 0, awareness: 0,
        bonds: 0, threatsKilled: 0, thermalEvents: 0, elapsed: 0 },
      nextThreatId: 7,
    }));
    const loaded = loadGame();
    if (!loaded) throw new Error("not loaded");
    expect(loaded.nextThreatId).toBe(7);
    expect(loaded.state.nanites).toBe(10);
  });
});

describe("error handling", () => {
  it("returns null when not JSON", () => {
    if (typeof localStorage === "undefined") throw new Error("ls unavail");
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadGame()).toBeNull();
  });
  it("returns null when missing", () => {
    if (typeof localStorage === "undefined") throw new Error("ls unavail");
    localStorage.clear();
    expect(loadGame()).toBeNull();
  });
});
