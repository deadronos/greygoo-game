/**
 * Top gauges — heat + ecophagy.
 */

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
  const heatHint = pickBand(HEAT_HINT_BANDS, state.heat).msg;
  const ecoHint = pickBand(ECO_HINT_BANDS, state.ecophagy).msg;

  const isCritical = state.heat > HEAT_RUNAWAY;

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
      {isCritical && <CriticalFlash />}
    </section>
  );
}

/** Body-level critical flash — toggles a class on <body>. */
function CriticalFlash() {
  if (typeof document === "undefined") return null;
  document.body.classList.add("critical-flash");
  return null;
}