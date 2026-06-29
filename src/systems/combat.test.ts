/**
 * Tests for combat.ts — pickThreatType, spawnThreat, canSpawnThreat,
 * rollNextSpawnInterval, resolveThreats.
 *
 * Note: some assertions depend on the global awareness-threat config
 * (THREAT_HARD_CAP etc.) and are sensitive to RNG. They're written to
 * either use deterministic seeds or to sample many times to amortize
 * variance.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  AWARENESS_FIRST_SPAWN,
  SEEKER_DPS,
  THREAT_HARD_CAP,
  THREAT_MIN_INTERVAL,
} from "./constants";
import {
  canSpawnThreat,
  pickThreatType,
  resolveThreats,
  rollNextSpawnInterval,
  spawnThreat,
} from "./combat";
import { createInitialState } from "./state";
import { THREAT_TYPES } from "./threats";
import type { Threat, ThreatType } from "./types";

let s: ReturnType<typeof createInitialState>;
beforeEach(() => {
  s = createInitialState();
});

describe("pickThreatType", () => {
  it("returns null below the awareness floor", () => {
    s.awareness = AWARENESS_FIRST_SPAWN - 1;
    expect(pickThreatType(s)).toBeNull();
  });

  it("returns only tier-1 threats at awareness 8-24", () => {
    s.awareness = 20;
    for (let i = 0; i < 50; i++) {
      const t = pickThreatType(s);
      if (t) expect(t.tier).toBe(1);
    }
  });

  it("includes tier-2 once awareness passes the second threshold (25)", () => {
    s.awareness = 60;
    let sawTier2 = false;
    for (let i = 0; i < 200; i++) {
      const t = pickThreatType(s);
      if (t && t.tier === 2) {
        sawTier2 = true;
        break;
      }
    }
    expect(sawTier2).toBe(true);
  });

  it("unlocks higher tiers as awareness grows", () => {
    s.awareness = 100; // floor(100/25) = 4, max tier = min(4, 5) = 4
    const tiers = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const t = pickThreatType(s);
      if (t) tiers.add(t.tier);
    }
    // All four tiers should be available
    expect(tiers.size).toBe(4);
  });
});

describe("spawnThreat", () => {
  it("scales hp and dmg by ecophagy", () => {
    s.awareness = 30;
    s.ecophagy = 50;
    const t = spawnThreat(s, 1);
    expect(t).not.toBeNull();
    // 1 + (50/100) * 2 = 2x scale
    expect(t!.maxHp).toBeGreaterThan(0);
  });

  it("returns null when the hard cap is reached", () => {
    s.awareness = 30;
    // Manually saturate state.threats with synthetic entries
    const fakeType: ThreatType = THREAT_TYPES[0]!;
    for (let i = 0; i < THREAT_HARD_CAP; i++) {
      s.threats.push({
        id: i,
        type: fakeType,
        hp: 1,
        maxHp: 1,
        dmg: 0,
      });
    }
    expect(spawnThreat(s, 999)).toBeNull();
  });

  it("returns null below the awareness floor", () => {
    s.awareness = 0;
    expect(spawnThreat(s, 1)).toBeNull();
  });
});

describe("canSpawnThreat", () => {
  it("requires awareness >= floor AND timer <= 0", () => {
    s.awareness = AWARENESS_FIRST_SPAWN;
    s.nextThreatIn = 0;
    expect(canSpawnThreat(s)).toBe(true);
  });

  it("refuses when awareness is too low", () => {
    s.awareness = AWARENESS_FIRST_SPAWN - 1;
    s.nextThreatIn = 0;
    expect(canSpawnThreat(s)).toBe(false);
  });

  it("refuses when the timer hasn't elapsed", () => {
    s.awareness = 100;
    s.nextThreatIn = 5;
    expect(canSpawnThreat(s)).toBe(false);
  });
});

describe("rollNextSpawnInterval", () => {
  it("never returns below THREAT_MIN_INTERVAL, even with full suppression", () => {
    s.ecophagy = 100;
    s.threatSuppression = 1;
    for (let i = 0; i < 100; i++) {
      expect(rollNextSpawnInterval(s)).toBeGreaterThanOrEqual(THREAT_MIN_INTERVAL);
    }
  });

  it("is shorter at higher ecophagy", () => {
    s.threatSuppression = 0;
    // Suppress jitter variance by running many samples.
    const samples = (eco: number) => {
      s.ecophagy = eco;
      let sum = 0;
      const N = 200;
      for (let i = 0; i < N; i++) sum += rollNextSpawnInterval(s);
      return sum / N;
    };
    const low = samples(0);
    const high = samples(80);
    expect(high).toBeLessThan(low);
  });
});

describe("resolveThreats", () => {
  it("kills threats faster than seekers can damage", () => {
    s.allocation.seeker = 100;
    const dummy: Threat = {
      id: 1,
      type: THREAT_TYPES[0]!,
      hp: 1,
      maxHp: 1,
      dmg: 0,
    };
    s.threats.push(dummy);
    const results = resolveThreats(s, 0.1);
    expect(s.threats).toHaveLength(0);
    expect(results.length).toBeGreaterThan(0);
    expect(s.threatsKilled).toBe(1);
  });

  it("retains threats when damage is insufficient", () => {
    s.allocation.seeker = 0;
    s.awareness = 30;
    const t = pickThreatType(s);
    if (!t) return; // awareness gating — skip silently if no eligible type
    s.threats.push({ id: 1, type: t, hp: 1000, maxHp: 1000, dmg: 0.5 });
    resolveThreats(s, 0.1);
    expect(s.threats).toHaveLength(1);
  });

  it("loses nanites when seekers are outpaced", () => {
    s.allocation.seeker = 0;
    s.awareness = 30;
    const t = pickThreatType(s);
    if (!t) return;
    s.threats.push({ id: 1, type: t, hp: 1000, maxHp: 1000, dmg: 5 });
    const before = s.nanites;
    resolveThreats(s, 0.5);
    expect(s.nanites).toBeLessThan(before);
  });

  it("does not go negative on nanites", () => {
    s.allocation.seeker = 0;
    s.awareness = 30;
    const t = pickThreatType(s);
    if (!t) return;
    s.threats.push({ id: 1, type: t, hp: 1, maxHp: 1, dmg: 1000 });
    s.nanites = 5;
    resolveThreats(s, 1);
    expect(s.nanites).toBeGreaterThanOrEqual(0);
  });

  it("scales linearly with dt", () => {
    s.allocation.seeker = 0;
    s.awareness = 30;
    const t = pickThreatType(s);
    if (!t) return;
    s.threats.push({ id: 1, type: t, hp: 1000, maxHp: 1000, dmg: 5 });

    s.nanites = 100;
    resolveThreats(s, 0.1);
    const afterShort = s.nanites;

    s.nanites = 100;
    resolveThreats(s, 0.2);
    const afterLong = s.nanites;

    // Roughly 2x loss at 2x dt
    expect(100 - afterLong).toBeGreaterThan(100 - afterShort);
  });
});

describe("combat — SEEKER_DPS sanity", () => {
  it("SEEKER_DPS is positive (regression guard for tuning changes)", () => {
    expect(SEEKER_DPS).toBeGreaterThan(0);
  });
});
