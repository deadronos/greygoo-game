/**
 * Central visualization panel: canvas + readout stats.
 */

import { Panel } from "@/components/panels/Panel";
import { Stat } from "@/components/panels/Stat";
import { selectDerived, selectState, useGameStore } from "@/store/gameStore";

import { BiosphereViz } from "./BiosphereViz";
import styles from "./VizPanel.module.css";

export function VizPanel() {
  const state = useGameStore(selectState);
  const derived = useGameStore(selectDerived);

  return (
    <Panel title="BIOSPHERE TELEMETRY">
      <div className={styles.canvasWrap}>
        <BiosphereViz />
      </div>
      <div className={styles.stats}>
        <Stat label="Active Threats" value={state.threats.length} />
        <Stat label="Seeker DPS" value={derived.seekerDps.toFixed(1)} />
        <Stat label="Cooling" value={`${derived.coolingRate.toFixed(2)}/s`} />
        <Stat label="Replication" value={`${derived.harvesterBiomassRate.toFixed(2)}/s`} />
      </div>
    </Panel>
  );
}