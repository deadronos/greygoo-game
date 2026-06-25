/**
 * Primary action panel — the BREAK BOND button + its stats line.
 */

import { useEffect, useRef } from "react";

import { Panel } from "@/components/panels/Panel";
import { BondButton } from "@/components/panels/Button";
import { useGameStore } from "@/store/gameStore";
import {
  CLICK_BIOMASS,
  CLICK_ENERGY,
  CLICK_HEAT,
  HEAT_LOCKOUT_MULTIPLIER,
} from "@/systems/constants";
import { heatCap } from "@/systems/state";
import { selectDerived, selectState, shallow } from "@/store/gameStore";

import styles from "./PrimaryAction.module.css";

export function PrimaryAction() {
  const state = useGameStore(selectState);
  const derived = useGameStore(selectDerived, shallow);
  const clickBreakBond = useGameStore((s) => s.clickBreakBond);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const lockout = state.heat >= heatCap(state) * HEAT_LOCKOUT_MULTIPLIER;

  function onClick() {
    clickBreakBond();
    // Blur so Space/Enter doesn't re-fire the native button click
    // on top of the global keyboard-shortcut handler.
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLButtonElement) {
      document.activeElement.blur();
    }
  }

  // Spawn click-burst particles when the button is clicked.
  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    function onClick() {
      for (let i = 0; i < 4; i++) {
        const p = document.createElement("div");
        p.className = "click-burst";
        const ang = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 60;
        p.style.setProperty("--tx", `${Math.cos(ang) * dist}px`);
        p.style.setProperty("--ty", `${Math.sin(ang) * dist}px`);
        p.style.left = "50%";
        p.style.top = "50%";
        p.style.background = `hsl(${160 + Math.random() * 40}, 90%, 65%)`;
        el!.appendChild(p);
        setTimeout(() => p.remove(), 700);
      }
    }
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, []);

  // Right-click to mine silicates (original behavior).
  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    useGameStore.getState().clickMine();
  }

  const energy = (CLICK_ENERGY * state.clickEnergyMul).toFixed(1);
  const heat = (CLICK_HEAT * state.clickHeatMul).toFixed(2);
  const biomass = CLICK_BIOMASS.toFixed(2);

  return (
    <Panel title="PRIMARY ACTION">
      <BondButton
        ref={buttonRef}
        main="BREAK BOND"
        sub={`+${derived.bondEnergy.toFixed(1)} energy · +${derived.bondHeat.toFixed(2)} heat`}
        cooling={lockout}
        onClick={onClick}
        onContextMenu={onContextMenu}
      />
      <div className={styles.stats}>
        <div><span>Energy / click</span><b>{energy}</b></div>
        <div><span>Heat / click</span><b>{heat}</b></div>
        <div><span>Biomass / click</span><b>{biomass}</b></div>
      </div>
    </Panel>
  );
}