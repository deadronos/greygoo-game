# Quality Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land five quality improvements previously outlined in a review: introduce a Vitest test harness and full coverage of the systems layer, harden save-versioning, add granular Zustand selectors, and round out accessibility/a11y.

**Architecture:** Pure-function systems layer (`src/systems/*`) is preserved as the single source of game logic; tests live colocated (`*.test.ts`) and exercise the modules directly. Save versioning lives in `save.ts` with a `migrate()` step ahead of `mergeSave()`. Per-slice selectors are added in `gameStore.ts` alongside existing top-level selectors. Accessibility changes touch only the presentation layer (`components/`, `styles/`) and add an opt-in `prefers-reduced-motion` guard, focus-trap overlays, `aria-live` log, and `aria-label`s on icon buttons.

**Tech Stack:** React 18 + TypeScript 5.6 + Vite 5 + Zustand 4.5. Test runner: **Vitest 1.x**. Persistence: `localStorage`.

---

## File Structure

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Test runner config (jsdom env, path aliases, include globs) |
| `package.json` | Add `vitest`, `jsdom`, `@vitest/coverage-v8` to devDeps; add `test`/`test:run` scripts |
| `src/test/setup.ts` | Shared test setup (no DOM-incompatible browser APIs needed yet) |
| `src/systems/state.test.ts` | Tests `mergeSave`, `isValidThreat`, `asFiniteNumber`, `createInitialState`, `heatCap` |
| `src/systems/actions.test.ts` | Tests `breakBond`, `mineSilicates`, `refineMetals`, `replicateNanite`, `changeAllocation`, `buyUpgrade` |
| `src/systems/simulation.test.ts` | Tests `heatEfficiency`, `simulate` clamp/`derive` invariants, `derivedStats`, `checkEndCondition` |
| `src/systems/combat.test.ts` | Tests `pickThreatType` weighting/awareness gating, `rollNextSpawnInterval` min, `resolveThreats` linear formula |
| `src/systems/upgrades.test.ts` | Tests each upgrade's `apply` mutator + cost consumption |
| `src/systems/format.test.ts` | Tests `fmtTime`, `pickBand`, `nowHMS` |
| `src/systems/save.ts` (modified) | Adds `CURRENT_SAVE_VERSION`, `migrateSave`, version-aware `saveGame`/`loadGame` |
| `src/systems/save.test.ts` | Round-trip + migration tests |
| `src/store/gameStore.ts` (modified) | Adds `selectResources`, `selectAllocation`, `selectThreats`, `selectMetrics` |
| `src/components/overlays/Overlay.tsx` (modified) | Adds `role="dialog"`, focus trap, restore focus |
| `src/components/log/EventLog.tsx` (modified) | Adds `role="log"` + `aria-live="polite"` |
| `src/components/allocation/AllocationRow.tsx` (modified) | Adds `aria-label` to +/- buttons |
| `src/components/overlays/HelpOverlay.tsx` (new) | `?` keybindings cheatsheet |
| `src/styles/index.css` (modified) | Adds `prefers-reduced-motion` block |
| `src/hooks/useHelpOverlay.ts` (new) | Mounts `?` shortcut |
| `src/store/gameStore.ts` (modified) | Adds `helpOpen` flag + `toggleHelp` |

Tasks appear below in **dependency order**, not user-facing priority. Run them in sequence; each merges into the previous state.

---

## Task 1: Bootstrap Vitest (TDD red → green scaffold)

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/systems/smoke.test.ts`
- Modify: `package.json` (add deps + scripts)

- [ ] **Step 1: Add deps + scripts**
  ```bash
  npm install -D vitest@^1.6.0 jsdom@^24.0.0 @vitest/coverage-v8@^1.6.0
  ```
  Add to `package.json`:
  ```jsonc
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
  ```

- [ ] **Step 2: Write vitest.config.ts**
  ```ts
  import { defineConfig } from "vitest/config";
  import path from "node:path";
  export default defineConfig({
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    test: {
      environment: "jsdom",
      globals: true,
      include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
      setupFiles: ["./src/test/setup.ts"],
    },
  });
  ```

- [ ] **Step 3: Write src/test/setup.ts**
  ```ts
  // Currently no DOM bootstrap is required; this file is a hook for
  // future setup (e.g. fake-indexeddb). Localstorage in jsdom is per-test.
  export {};
  ```

- [ ] **Step 4: Write a deliberately failing smoke test**
  ```ts
  // src/systems/smoke.test.ts
  import { describe, expect, it } from "vitest";
  import { createInitialState } from "./state";

  describe("smoke", () => {
    it("createInitialState returns expected defaults", () => {
      const s = createInitialState();
      expect(s.nanites).toBe(10);
      expect(s.allocation.harvester).toBe(5);
    });
  });
  ```

- [ ] **Step 5: Run `npm run test:run` and verify the test passes**
  Expected: 1 passed. (Red is not applicable here — the test exercises existing behavior; it confirms the harness works.)

- [ ] **Step 6: Commit**
  ```bash
  git add vitest.config.ts src/test/setup.ts src/systems/smoke.test.ts package.json package-lock.json
  git commit -m "test: bootstrap vitest harness"
  ```

---

## Task 2: Tests for state.ts + tighten isValidThreat tier validation

**Files:**
- Create: `src/systems/state.test.ts`
- Modify: `src/systems/state.ts` (tighten `isValidThreat`)

- [ ] **Step 1: Write tests** (these must FAIL at first)
  ```ts
  // src/systems/state.test.ts
  import { describe, expect, it } from "vitest";
  import { createInitialState, heatCap, mergeSave } from "./state";

  describe("mergeSave", () => {
    it("falls back when allocation has non-numeric values", () => {
      const r = mergeSave({ state: { allocation: { harvester: "nope", radiator: -2, seeker: 7 } } as never });
      expect(r.state.allocation.harvester).toBe(5);
      expect(r.state.allocation.radiator).toBe(0);
      expect(r.state.allocation.seeker).toBe(7);
    });
    it("drops threats whose tier is out of range", () => {
      const r = mergeSave({
        state: {
          threats: [
            { id: 1, hp: 1, maxHp: 1, dmg: 1, type: { tier: 999 as never, name: "X", desc: "", maxHp: 1, dmg: 1, spawn: 1 } },
            { id: 2, hp: 1, maxHp: 1, dmg: 1, type: { tier: 2, name: "EMP", desc: "x", maxHp: 1, dmg: 1, spawn: 1 } },
          ],
        } as never,
      });
      expect(r.state.threats).toHaveLength(1);
    });
    it("drops unknown upgrade ids", () => {
      const r = mergeSave({ state: { upgrades: { harv1: true, fakeUpgrade: true } } as never });
      expect(r.state.upgrades.harv1).toBe(true);
      expect((r.state.upgrades as Record<string, unknown>).fakeUpgrade).toBeUndefined();
    });
    it("coerces canRefine to boolean", () => {
      const r = mergeSave({ state: { canRefine: 1 } as never });
      expect(r.state.canRefine).toBe(false);
    });
    it("clamps threatSuppression to [0, 1]", () => {
      const a = mergeSave({ state: { threatSuppression: -0.5 } as never });
      const b = mergeSave({ state: { threatSuppression: 5 } as never });
      expect(a.state.threatSuppression).toBe(0);
      expect(b.state.threatSuppression).toBe(1);
    });
    it("nextThreatId defaults to 1 when missing", () => {
      const r = mergeSave({ state: {} });
      expect(r.nextThreatId).toBe(1);
    });
  });
  describe("createInitialState", () => {
    it("yields the documented starting values", () => {
      const s = createInitialState();
      expect(s.biomass).toBe(5);
      expect(s.silicates).toBe(8);
      expect(s.metals).toBe(0);
      expect(s.energy).toBe(5);
      expect(s.heat).toBe(0);
      expect(s.ecophagy).toBe(0);
    });
  });
  describe("heatCap", () => {
    it("adds heatCapBonus", () => {
      expect(heatCap(createInitialState())).toBe(100);
      const s = createInitialState();
      s.heatCapBonus = 25;
      expect(heatCap(s)).toBe(125);
    });
  });
  ```

- [ ] **Step 2: Run tests; observe failures**

  Some tests will fail (e.g. `radiator: -2` is NOT clamped to 0 today because `asFiniteNumber` only checks NaN; `radiator: -2` IS finite, so the test for -2 will fail). The `tier: 999` test will ALSO fail because current `isValidThreat` doesn't bound tier.

- [ ] **Step 3: Tighten isValidThreat and asFiniteNumber helpers**

  Add tier and stat bounds in `src/systems/state.ts`:
  ```ts
  function isValidThreat(t: unknown): t is Threat {
    if (!t || typeof t !== "object") return false;
    const o = t as Record<string, unknown>;
    if (typeof o.id !== "number" || !Number.isFinite(o.id)) return false;
    if (typeof o.hp !== "number" || !Number.isFinite(o.hp)) return false;
    if (typeof o.maxHp !== "number" || !Number.isFinite(o.maxHp) || o.maxHp <= 0) return false;
    if (typeof o.dmg !== "number" || !Number.isFinite(o.dmg) || o.dmg < 0) return false;
    if (!o.type || typeof o.type !== "object") return false;
    const tt = o.type as Record<string, unknown>;
    return (
      typeof tt.tier === "number" && [1, 2, 3, 4].includes(tt.tier) &&
      typeof tt.name === "string" &&
      typeof tt.desc === "string" &&
      typeof tt.maxHp === "number" && tt.maxHp > 0 &&
      typeof tt.dmg === "number" && tt.dmg >= 0 &&
      typeof tt.spawn === "number" && tt.spawn > 0
    );
  }
  ```

  For `-2` radiator, the fix is to apply `NON_NEG` to allocation fields inside `mergeSave`:
  ```ts
  merged.allocation = {
    harvester: NON_NEG(asFiniteNumber(readAllocField(merged.allocation, "harvester"), base.allocation.harvester)),
    radiator:  NON_NEG(asFiniteNumber(readAllocField(merged.allocation, "radiator"),  base.allocation.radiator)),
    seeker:    NON_NEG(asFiniteNumber(readAllocField(merged.allocation, "seeker"),    base.allocation.seeker)),
  };
  ```

- [ ] **Step 4: Run tests; verify all pass**
  Run: `npm run test:run`
  Expected: all pass.

- [ ] **Step 5: Commit**
  ```bash
  git add src/systems/state.ts src/systems/state.test.ts
  git commit -m "test(state): cover mergeSave hardening; clamp neg allocation; bound threat tier/HP/dmg"
  ```

---

## Task 3: Tests for actions.ts

**Files:**
- Create: `src/systems/actions.test.ts`

- [ ] **Step 1: Write tests**
  ```ts
  import { beforeEach, describe, expect, it } from "vitest";
  import { createInitialState } from "./state";
  import { breakBond, mineSilicates, refineMetals, replicateNanite, changeAllocation, buyUpgrade } from "./actions";

  let s: ReturnType<typeof createInitialState>;
  beforeEach(() => { s = createInitialState(); });

  describe("breakBond", () => {
    it("is blocked by thermal lockout", () => {
      s.heat = 121; // 1.2 * cap
      const o = breakBond(s);
      expect(o.mutated).toBe(false);
      expect(o.result.level).toBe("warn");
    });
    it("gains energy, heat, biomass on success", () => {
      const o = breakBond(s);
      expect(o.mutated).toBe(true);
      expect(s.energy).toBeGreaterThan(5);
      expect(s.heat).toBeGreaterThan(0);
      expect(s.biomass).toBeGreaterThan(5);
      expect(s.bonds).toBe(1);
    });
  });

  describe("mineSilicates", () => {
    it("fails without energy", () => {
      s.energy = 0;
      const o = mineSilicates(s);
      expect(o.mutated).toBe(false);
    });
    it("subtracts energy, adds silicate, absorbs heat", () => {
      s.heat = 5;
      const before = s.silicates;
      mineSilicates(s);
      expect(s.energy).toBe(4);
      expect(s.silicates).toBe(before + 1);
      expect(s.heat).toBeLessThanOrEqual(3);
    });
  });

  describe("refineMetals", () => {
    it("fails without canRefine", () => {
      const o = refineMetals(s);
      expect(o.mutated).toBe(false);
    });
    it("succeeds when canRefine and resources suffice", () => {
      s.canRefine = true; s.silicates = 5; s.energy = 5;
      refineMetals(s);
      expect(s.metals).toBe(1);
      expect(s.silicates).toBe(4);
      expect(s.energy).toBe(3);
    });
  });

  describe("replicateNanite", () => {
    it("fails when short on energy or biomass", () => {
      expect(replicateNanite(s).mutated).toBe(false); // base state has 5e/5b, cost 8e
      s.biomass = 5; s.energy = 50;
      replicateNanite(s);
      expect(s.nanites).toBe(11);
    });
    it("leaves new nanite unallocated", () => {
      s.biomass = 50; s.energy = 100;
      const total = s.allocation.harvester + s.allocation.radiator + s.allocation.seeker;
      replicateNanite(s);
      const after = s.allocation.harvester + s.allocation.radiator + s.allocation.seeker;
      expect(after).toBe(total);
    });
  });

  describe("changeAllocation", () => {
    it("clamps +1 when fully allocated", () => {
      s.allocation.harvester = 10;
      s.allocation.radiator = 0;
      s.allocation.seeker = 0;
      const o = changeAllocation(s, "harvester", 5);
      expect(o.mutated).toBe(false);
    });
    it("clamps a step down to current", () => {
      s.allocation.harvester = 2;
      const o = changeAllocation(s, "harvester", -10);
      // Internally clamped to -2
      expect(o.mutated).toBe(false); // changes by 0 are reported as no-op per existing behavior
      expect(s.allocation.harvester).toBe(2);
    });
  });

  describe("buyUpgrade", () => {
    it("consumes resources and applies mutator", () => {
      s.biomass = 100;
      const o = buyUpgrade(s, "harv1").outcome;
      expect(o.mutated).toBe(true);
      expect(s.biomass).toBe(75);
      expect(s.harvYieldMul).toBeCloseTo(1.3);
    });
    it("rejects unknown id and already-purchased upgrades", () => {
      expect(buyUpgrade(s, "nope").outcome.result.ok).toBe(false);
      s.biomass = 100;
      buyUpgrade(s, "harv1");
      const o2 = buyUpgrade(s, "harv1").outcome;
      expect(o2.mutated).toBe(false);
      expect(o2.result.msg).toMatch(/already/i);
    });
    it("rejects when cannot afford", () => {
      s.biomass = 0;
      const o = buyUpgrade(s, "harv1").outcome;
      expect(o.mutated).toBe(false);
    });
  });
  ```

- [ ] **Step 2: Run tests; verify pass** (these should all pass on the first run because they exercise existing behavior.)

- [ ] **Step 3: Commit**
  ```bash
  git add src/systems/actions.test.ts
  git commit -m "test(actions): cover player action handlers"
  ```

---

## Task 4: Tests for simulation.ts

**Files:**
- Create: `src/systems/simulation.test.ts`

- [ ] **Step 1: Write tests**
  ```ts
  import { beforeEach, describe, expect, it } from "vitest";
  import { createInitialState } from "./state";
  import { checkEndCondition, derivedStats, heatEfficiency, simulate } from "./simulation";

  let s: ReturnType<typeof createInitialState>;
  beforeEach(() => { s = createInitialState(); });

  describe("heatEfficiency", () => {
    it("is 1 at low heat", () => { s.heat = 30; expect(heatEfficiency(s)).toBe(1); });
    it("drops to 0.7 above warning", () => { s.heat = 61; expect(heatEfficiency(s)).toBeCloseTo(0.7); });
    it("drops to 0.25 at runaway", () => { s.heat = 101; expect(heatEfficiency(s)).toBeCloseTo(0.25); });
  });

  describe("simulate", () => {
    it("clamps allocation when swarm shrinks below total", () => {
      s.nanites = 5;
      s.allocation = { harvester: 5, radiator: 5, seeker: 5 };
      simulate(s, 1, 0.1);
      const total = s.allocation.harvester + s.allocation.radiator + s.allocation.seeker;
      expect(total).toBe(5);
    });
    it("emits no thermal damage below runaway", () => {
      s.heat = 80;
      const r = simulate(s, 1, 0.1);
      const thermalEvent = r.results.find((x) => x.msg?.includes("THERMAL EVENT"));
      expect(thermalEvent).toBeUndefined();
    });
    it("auto-allocates idle when autoAlloc > 0", () => {
      s.autoAlloc = 1; s.nanites = 12;
      s.allocation = { harvester: 5, radiator: 3, seeker: 2 };
      simulate(s, 1, 0.1);
      expect(s.allocation.harvester).toBeGreaterThanOrEqual(6);
    });
  });

  describe("checkEndCondition", () => {
    it("returns won at ecophagy 100", () => {
      s.ecophagy = 100; expect(checkEndCondition(s)).toBe("won");
    });
    it("returns lost at zero nanites", () => {
      s.nanites = 0; expect(checkEndCondition(s)).toBe("lost");
    });
    it("returns null mid-game", () => {
      expect(checkEndCondition(s)).toBeNull();
    });
  });

  describe("derivedStats", () => {
    it("mirrors heat-throttled biomass rate", () => {
      const baseRate = derivedStats(s).harvesterBiomassRate;
      s.heat = 90;
      const throttled = derivedStats(s).harvesterBiomassRate;
      expect(throttled).toBeLessThan(baseRate);
    });
    it("returns correct replication tier", () => {
      s.nanites = 30; expect(derivedStats(s).replicationTier).toBe("II");
      s.nanites = 600; expect(derivedStats(s).replicationTier).toBe("IV");
      s.nanites = 3000; expect(derivedStats(s).replicationTier).toBe("V");
    });
  });
  ```

- [ ] **Step 2: Run tests; verify pass**

- [ ] **Step 3: Commit**
  ```bash
  git add src/systems/simulation.test.ts
  git commit -m "test(simulation): cover heat steps, clamp, end-conditions, derivedStats"
  ```

---

## Task 5: Tests for combat.ts

**Files:**
- Create: `src/systems/combat.test.ts`

- [ ] **Step 1: Write tests**
  ```ts
  import { beforeEach, describe, expect, it } from "vitest";
  import { createInitialState } from "./state";
  import {
    canSpawnThreat,
    pickThreatType,
    resolveThreats,
    rollNextSpawnInterval,
    spawnThreat,
  } from "./combat";

  let s: ReturnType<typeof createInitialState>;
  beforeEach(() => { s = createInitialState(); });

  describe("pickThreatType", () => {
    it("returns null below the awareness floor", () => {
      s.awareness = 5;
      expect(pickThreatType(s)).toBeNull();
    });
    it("returns tier-1 only at awareness 8-24", () => {
      s.awareness = 20;
      const t = pickThreatType(s);
      expect(t?.tier).toBe(1);
    });
    it("includes tier-2 once awareness passes 25", () => {
      s.awareness = 60;
      // run multiple samples since RNG-weighted
      const tiers = new Set<number>();
      for (let i = 0; i < 200; i++) {
        const t = pickThreatType(s);
        if (t) tiers.add(t.tier);
      }
      expect(tiers.has(2)).toBe(true);
    });
  });

  describe("spawnThreat", () => {
    it("scales hp/dmg by ecophagy", () => {
      s.awareness = 30; s.ecophagy = 50;
      const t = spawnThreat(s, 1);
      expect(t).not.toBeNull();
      expect(t!.maxHp).toBeGreaterThan(0);
    });
    it("returns null when hard cap reached", () => {
      s.awareness = 30;
      for (let i = 0; i < 50; i++) s.threats.push({ id: i, type: pickThreatType(s)!, hp: 1, maxHp: 1, dmg: 0 });
      expect(spawnThreat(s, 100)).toBeNull();
    });
  });

  describe("canSpawnThreat", () => {
    it("requires awareness >= floor and timer <= 0", () => {
      s.awareness = 8; s.nextThreatIn = 0; expect(canSpawnThreat(s)).toBe(true);
      s.awareness = 7; expect(canSpawnThreat(s)).toBe(false);
      s.nextThreatIn = 5; expect(canSpawnThreat(s)).toBe(false);
    });
  });

  describe("rollNextSpawnInterval", () => {
    it("never returns below THREAT_MIN_INTERVAL", () => {
      s.ecophagy = 100;
      s.threatSuppression = 1; // would otherwise push it to ~0
      for (let i = 0; i < 50; i++) {
        expect(rollNextSpawnInterval(s)).toBeGreaterThanOrEqual(6);
      }
    });
  });

  describe("resolveThreats", () => {
    it("kills threats faster than seekers can damage", () => {
      s.allocation.seeker = 100;
      s.threats.push({ id: 1, type: pickThreatType(s)!, hp: 1, maxHp: 1, dmg: 0 });
      // Awareness needs to be at least at the floor to even have a tier to pick,
      // but we only need *some* threat in the array for this test.
      const r = resolveThreats(s, 0.1);
      expect(s.threats).toHaveLength(0);
      expect(r.length).toBeGreaterThan(0);
    });
    it("retains threats when damage is insufficient", () => {
      s.allocation.seeker = 0;
      s.awareness = 30; s.threats.push({ id: 1, type: pickThreatType(s)!, hp: 1000, maxHp: 1000, dmg: 0.5 });
      resolveThreats(s, 0.1);
      expect(s.threats).toHaveLength(1);
    });
  });
  ```

- [ ] **Step 2: Run tests; verify pass**

- [ ] **Step 3: Commit**
  ```bash
  git add src/systems/combat.test.ts
  git commit -m "test(combat): cover threat picker, spawn cap, interval floor, resolution"
  ```

---

## Task 6: Tests for upgrades.ts and format.ts

**Files:**
- Create: `src/systems/upgrades.test.ts`
- Create: `src/systems/format.test.ts`

- [ ] **Step 1: Write upgrade tests**
  ```ts
  import { beforeEach, describe, expect, it } from "vitest";
  import { createInitialState } from "./state";
  import { findUpgrade, UPGRADES } from "./upgrades";

  describe("UPGRADES catalog integrity", () => {
    it("ids are unique", () => {
      const ids = UPGRADES.map((u) => u.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
    it("every cost is non-negative", () => {
      for (const u of UPGRADES) for (const v of Object.values(u.cost)) expect(v).toBeGreaterThanOrEqual(0);
    });
  });

  describe("upgrade mutators", () => {
    let s: ReturnType<typeof createInitialState>;
    beforeEach(() => { s = createInitialState(); });

    it("harv1: +30% yield", () => { findUpgrade("harv1")!.apply(s); expect(s.harvYieldMul).toBeCloseTo(1.3); });
    it("rad2: stacks with rad1", () => { findUpgrade("rad1")!.apply(s); findUpgrade("rad2")!.apply(s); expect(s.radCoolMul).toBeCloseTo(1.4 * 1.6); });
    it("refine1: sets canRefine", () => { findUpgrade("refine1")!.apply(s); expect(s.canRefine).toBe(true); });
    it("tol1: raises heatCapBonus", () => { findUpgrade("tol1")!.apply(s); expect(s.heatCapBonus).toBe(25); });
    it("immune1: stacks", () => { findUpgrade("immune1")!.apply(s); findUpgrade("immune1")!.apply(s); expect(s.threatSuppression).toBe(0.5); });
  });
  ```

- [ ] **Step 2: Write format tests**
  ```ts
  import { describe, expect, it } from "vitest";
  import { fmtTime, pickBand } from "./format";

  describe("fmtTime", () => {
    it("formats seconds, minutes, and hours", () => {
      expect(fmtTime(0)).toBe("0s");
      expect(fmtTime(45)).toBe("45s");
      expect(fmtTime(60)).toBe("1m 0s");
      expect(fmtTime(125)).toBe("2m 5s");
      expect(fmtTime(3600)).toBe("1h 0m");
    });
  });

  describe("pickBand", () => {
    const bands = [
      { max: 30, label: "low" },
      { max: 60, label: "mid" },
      { max: Infinity, label: "high" },
    ];
    it("returns the first band whose max >= value", () => {
      expect(pickBand(bands, 5).label).toBe("low");
      expect(pickBand(bands, 30).label).toBe("mid");
      expect(pickBand(bands, 100).label).toBe("high");
    });
  });
  ```

- [ ] **Step 3: Run tests; verify pass**

  Read `src/systems/format.ts` first to confirm exact `pickBand` return shape.

- [ ] **Step 4: Commit**
  ```bash
  git add src/systems/upgrades.test.ts src/systems/format.test.ts
  git commit -m "test(upgrades,format): cover catalog integrity and formatters"
  ```

---

## Task 7: Save schema versioning + migration

**Files:**
- Modify: `src/systems/save.ts`
- Create: `src/systems/save.test.ts`
- Modify: `src/systems/types.ts` (add `version` field to `SaveData`)

- [ ] **Step 1: Read `src/systems/format.ts` to confirm `pickBand` and `nowHMS` signatures.** (Done in Step 6 above.)

- [ ] **Step 2: Write failing tests for round-trip and migration**
  ```ts
  import { beforeEach, describe, expect, it, vi } from "vitest";
  import { createInitialState } from "./state";
  import { CURRENT_SAVE_VERSION, loadGame, saveGame } from "./save";

  beforeEach(() => { localStorage.clear(); });

  it("round-trips save and load on the current version", () => {
    const s = createInitialState();
    s.biomass = 1234;
    s.nanites = 42;
    saveGame(s, 99);
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.state.biomass).toBe(1234);
    expect(loaded!.nextThreatId).toBe(99);
  });

  it("embeds the schema version in the saved payload", () => {
    saveGame(createInitialState(), 1);
    const raw = JSON.parse(localStorage.getItem("entropic_devourer_save")!);
    expect(raw.version).toBe(CURRENT_SAVE_VERSION);
  });

  it("migrates a v1 save to v2", () => {
    // v1 saves are an object keyed directly off {state, nextThreatId};
    // migration adds a version field and tolerates missing fields.
    const v1 = {
      state: {
        biomass: 5,
        silicates: 8,
        metals: 0,
        energy: 5,
        heat: 0,
        nanites: 10,
        allocation: { harvester: 5, radiator: 3, seeker: 2 },
        ecophagy: 0,
        awareness: 0,
        bonds: 0,
        threatsKilled: 0,
        thermalEvents: 0,
        elapsed: 0,
      },
      nextThreatId: 7,
    };
    localStorage.setItem("entropic_devourer_save", JSON.stringify(v1));
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.nextThreatId).toBe(7);
  });

  it("returns null on unparseable data", () => {
    localStorage.setItem("entropic_devourer_save", "{not json");
    expect(loadGame()).toBeNull();
  });
  ```

- [ ] **Step 3: Run tests; observe failures** (round-trip test currently uses `entropic_devourer_save_v2`, expected is `entropic_devourer_save`.)

- [ ] **Step 4: Implement versioning**
  In `src/systems/types.ts`:
  ```ts
  export interface SaveData {
    version: number;
    state: GameState;
    nextThreatId: number;
  }
  ```

  In `src/systems/save.ts`:
  ```ts
  export const CURRENT_SAVE_VERSION = 2;

  // Version → migrator. Each migrator takes an unknown payload and
  // returns the next version's shape (still untyped — return is `unknown`).
  type MigrateFn = (raw: unknown) => unknown;
  const MIGRATIONS: Record<number, MigrateFn> = {
    1: (raw) => raw, // v1 → v2 is shape-compatible; just stamp the version
  };

  function migrateSave(raw: unknown): unknown {
    let v = (raw as { version?: number })?.version ?? 1;
    while (v < CURRENT_SAVE_VERSION) {
      const next = MIGRATIONS[v];
      if (!next) return null;
      raw = next(raw);
      v += 1;
    }
    return raw;
  }

  export function saveGame(state, nextThreatId) {
    const data: SaveData = {
      version: CURRENT_SAVE_VERSION,
      state: JSON.parse(JSON.stringify(state)),
      nextThreatId,
    };
    try { localStorage.setItem("entropic_devourer_save", JSON.stringify(data)); } catch (e) { console.error(e); }
  }

  export function loadGame(): { state: GameState; nextThreatId: number } | null {
    try {
      const raw = localStorage.getItem("entropic_devourer_save");
      if (!raw) return null;
      const migrated = migrateSave(JSON.parse(raw));
      if (!migrated) return null;
      return mergeSave(migrated as Partial<SaveData>);
    } catch (e) { console.error(e); return null; }
  }
  ```

  Update `STORAGE_KEY` constant from `"entropic_devourer_save_v2"` to `"entropic_devourer_save"`. (Both are referenced in `save.ts`.)

- [ ] **Step 5: Run all tests; verify pass**

- [ ] **Step 6: Commit**
  ```bash
  git add src/systems/save.ts src/systems/save.test.ts src/systems/types.ts
  git commit -m "feat(save): add schema version field and migration hook"
  ```

---

## Task 8: Per-slice selectors in gameStore

**Files:**
- Modify: `src/store/gameStore.ts`

- [ ] **Step 1: Add granular selectors**
  Append after the existing selectors near the bottom of `gameStore.ts`:
  ```ts
  // Slice selectors — opt in via useGameStore(sliceX, shallow) to avoid
  // re-rendering on unrelated state changes. Each one is stable as long
  // as the matching slice didn't change.
  export const selectResources = (s: GameStore) => ({
    biomass: s.state.biomass,
    silicates: s.state.silicates,
    metals: s.state.metals,
    energy: s.state.energy,
  });
  export const selectAllocation = (s: GameStore) => s.state.allocation;
  export const selectThreats = (s: GameStore) => s.state.threats;
  export const selectMetrics = (s: GameStore) => ({
    ecophagy: s.state.ecophagy,
    awareness: s.state.awareness,
    elapsed: s.state.elapsed,
    bonds: s.state.bonds,
    heat: s.state.heat,
    nanites: s.state.nanites,
  });
  export const selectUpgrades = (s: GameStore) => s.state.upgrades;
  export const selectSynthesis = (s: GameStore) => ({
    biomassHarvested: s.state.biomassHarvested,
    threatsKilled: s.state.threatsKilled,
    thermalEvents: s.state.thermalEvents,
  });
  ```

  Add a smoke test verifying equivalence with `selectState` slices:
  ```ts
  // src/store/gameStore.test.ts
  import { describe, expect, it } from "vitest";
  import { useGameStore, selectResources, selectMetrics, selectAllocation } from "./gameStore";

  describe("slice selectors", () => {
    it("expose the same fields as selectState", () => {
      useGameStore.setState({ state: { ...useGameStore.getState().state, biomass: 42 } });
      const r = selectResources(useGameStore.getState());
      expect(r.biomass).toBe(42);
    });
    it("return independent references for stable slices", () => {
      const m1 = selectMetrics(useGameStore.getState());
      useGameStore.setState((s) => ({ state: { ...s.state, bonds: s.state.bonds + 1 } }));
      const m2 = selectMetrics(useGameStore.getState());
      expect(m1).not.toBe(m2);
      const a1 = selectAllocation(useGameStore.getState());
      useGameStore.setState((s) => ({ state: { ...s.state, biomass: 99 } }));
      const a2 = selectAllocation(useGameStore.getState());
      expect(a1).toBe(a2); // allocation unchanged → stable identity
    });
  });
  ```

- [ ] **Step 2: Run tests; verify pass**

- [ ] **Step 3: Commit**
  ```bash
  git add src/store/gameStore.ts src/store/gameStore.test.ts
  git commit -m "perf(store): add granular per-slice selectors with stability guarantees"
  ```

---

## Task 9: Accessibility — overlays, log, motion, labels

**Files:**
- Modify: `src/components/overlays/Overlay.tsx`
- Modify: `src/components/log/EventLog.tsx`
- Modify: `src/components/allocation/AllocationRow.tsx`
- Modify: `src/styles/index.css`

- [ ] **Step 1: Add a focus trap helper**
  Create `src/components/overlays/focusTrap.ts`:
  ```ts
  import { useEffect, useRef } from "react";

  const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])';

  export function useFocusTrap<T extends HTMLElement>(active: boolean) {
    const ref = useRef<T | null>(null);
    useEffect(() => {
      if (!active || !ref.current) return;
      const root = ref.current;
      const previouslyFocused = document.activeElement as HTMLElement | null;
      const first = () => root.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
      const last  = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).pop();
      first()?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;
        const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) { e.preventDefault(); return; }
        const firstEl = items[0]!;
        const lastEl  = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === firstEl) { lastEl.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { firstEl.focus(); e.preventDefault(); }
      };
      root.addEventListener("keydown", onKey);
      return () => {
        root.removeEventListener("keydown", onKey);
        previouslyFocused?.focus?.();
      };
    }, [active]);
    return ref;
  }
  ```

- [ ] **Step 2: Update `Overlay.tsx` to use dialog semantics**
  ```tsx
  import type { ReactNode } from "react";
  import { useFocusTrap } from "./focusTrap";
  import styles from "./Overlay.module.css";

  export function Overlay({ children, label = "dialog", active = true }: { children: ReactNode; label?: string; active?: boolean }) {
    const ref = useFocusTrap<HTMLDivElement>(active);
    return (
      <div ref={ref} className={styles.overlay} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    );
  }
  ```

- [ ] **Step 3: Add `aria-live` to EventLog**
  ```tsx
  <div ref={ref} className={styles.log} role="log" aria-live="polite" aria-label="Simulation event log">
  ```

- [ ] **Step 4: Add `aria-label` to AllocationRow buttons**
  ```tsx
  <button onClick={() => onChange(-1)} disabled={!canRemove} aria-label={`Decrease ${name}`}>−</button>
  <button onClick={() => onChange(1)} disabled={!canAdd} aria-label={`Increase ${name}`}>+</button>
  ```

- [ ] **Step 5: Add `prefers-reduced-motion` block to index.css**
  Append:
  ```css
  /* Honor user motion preferences — disable non-essential animations,
     scanline flicker, and full-screen flashes. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
    #scanlines { display: none; }
    body.critical-flash { animation: none !important; box-shadow: inset 0 0 200px rgba(255, 40, 100, 0.25); }
  }
  ```

- [ ] **Step 6: Run `npm run typecheck`; verify clean**

- [ ] **Step 7: Commit**
  ```bash
  git add src/components/overlays/Overlay.tsx src/components/overlays/focusTrap.ts src/components/log/EventLog.tsx src/components/allocation/AllocationRow.tsx src/styles/index.css
  git commit -m "feat(a11y): dialog semantics + focus trap, aria-live log, aria-labels, prefers-reduced-motion"
  ```

---

## Task 10: In-game `?` keyboard cheatsheet

**Files:**
- Create: `src/components/overlays/HelpOverlay.tsx`
- Create: `src/hooks/useHelpOverlay.ts`
- Modify: `src/store/gameStore.ts` (add `helpOpen` flag + `toggleHelp`)
- Modify: `src/components/topbar/TopBar.tsx` (add `?` button) — verify it exists first by re-reading
- Modify: `src/hooks/useKeyboardShortcuts.ts` (open/close with `?`)

- [ ] **Step 1: Add store field**
  ```ts
  helpOpen: boolean;
  toggleHelp: () => void;
  ```
  Default `false`. `toggleHelp` flips it. `reset`/`restart`/`beginNewGame`/`wipeAndRestart` close it.

- [ ] **Step 2: Write `HelpOverlay.tsx`** rendering a static table of the keybinds (mirror the README's Controls table).

- [ ] **Step 3: Wire `?` key globally** in `useKeyboardShortcuts`. Also bind `Escape` to close any open overlay (help and the `play`/`intro`/`win`/`lose` overlays).

- [ ] **Step 4: Render `<HelpOverlay>` in `App.tsx` whenever `screen === "play" && helpOpen`.**

- [ ] **Step 5: Run `npm run typecheck`; verify clean**

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/overlays/HelpOverlay.tsx src/hooks/useHelpOverlay.ts src/store/gameStore.ts src/components/topbar/TopBar.tsx src/hooks/useKeyboardShortcuts.ts src/App.tsx
  git commit -m "feat(a11y): add in-game keyboard cheatsheet (? key)"
  ```

---

## Task 11: Final verification + build

- [ ] **Run `npm run typecheck`**
  Expected: 0 errors

- [ ] **Run `npm run test:run`**
  Expected: all tests pass (target ≈ 45)

- [ ] **Run `npm run build`**
  Expected: exit 0

- [ ] **Smoke check in dev server** (not blocking): `npm run dev` then load http://localhost:5173.

- [ ] **Final commit** (if any leftovers):
  ```bash
  git status
  # If there are no leftover changes, no commit needed.
  ```

---

## Self-Review Checklist

- [x] Spec coverage: every review item maps to one or more tasks (1=vitem, 2/10=a11y, 3=save, 4=selectors, 5=validation).
- [x] Placeholder scan: no "TBD"/"TODO"/"similar to"/etc.
- [x] Type consistency: `version: number` matches across `types.ts` and `save.ts`.

