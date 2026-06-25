/**
 * Top gauges — heat + ecophagy.
 */

import { useEffect } from "react";

import { Gauge } from "@/components/panels/Gauge";
import {
  ECO_HINT_BANDS,
  HEAT_HINT_BANDS,
  HEAT_WARNING,
  HEAT_CRITICAL,
  HEAT_RUNAWAY,
} from "@/systems/constants";
import { heatCap } from "@/systems/state";
import { heatColor, pickBand } from "@/systems/format";
import { selectState, useGameStore } from "@/store/gameStore";

import styles from "./Gauges.module.css";

export function Gauges() {
  const state = useGameStore(selectState);

  const cap = heatCap(state);
  const heatPct = (state.heat / cap) * 100;
  // HEAT_HINT_BANDS uses fractional thresholds so it tracks the cap.
  const heatHint = pickBand(HEAT_HINT_BANDS, state.heat / cap).msg;
  const ecoHint = pickBand(ECO_HINT_BANDS, state.ecophagy).msg;

  // "Critical" means we've crossed the actual heat cap (which the
  // chassis upgrade can raise), not the base 100.
  const isCritical = state.heat > cap;

  return (
    <section className={styles.row}>
      <Gauge
        label="THERMAL CEILING"
        valueText={`${state.heat.toFixed(1)} / ${cap} K*`}
        fillPercent={heatPct}
        hint={heatHint}
        variant="heat"
        fillStyle={{
          background: `linear-gradient(90deg, var(--heat-cool), ${heatColor(state.heat, HEAT_WARNING, HEAT_CRITICAL, HEAT_RUNAWAY)})`,
        }}
      />
      <Gauge
        label="ECOPHAGY PROGRESS"
        valueText={`${state.ecophagy.toFixed(2)}%`}
        fillPercent={state.ecophagy}
        hint={ecoHint}
        variant="eco"
      />
      {isCritical && <CriticalFlash active={isCritical} />}
    </section>
  );
}

/** Body-level critical flash — toggles a class on <body> via useEffect. */
function CriticalFlash({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add("critical-flash");
    return () => {
      document.body.classList.remove("critical-flash");
    };
  }, [active]);
  return null;
}
