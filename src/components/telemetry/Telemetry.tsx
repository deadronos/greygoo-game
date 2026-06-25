/**
 * Telemetry panel — small stats grid.
 */

import { Panel } from "@/components/panels/Panel";
import { Stat } from "@/components/panels/Stat";
import { selectDerived, selectState, useGameStore } from "@/store/gameStore";
import { fmt, fmtInt } from "@/systems/format";

import styles from "./Telemetry.module.css";

export function Telemetry() {
  const state = useGameStore(selectState);
  const derived = useGameStore(selectDerived);

  return (
    <Panel title="SWARM TELEMETRY">
      <div className={styles.grid}>
        <Stat label="Energy reserves"     value={fmt(state.energy)} />
        <Stat label="Total consumed"      value={fmt(state.totalConsumed)} />
        <Stat label="Bonds broken"        value={fmtInt(state.bonds)} />
        <Stat label="Threats neutralized" value={fmtInt(state.threatsKilled)} />
        <Stat label="Thermal events"      value={fmtInt(state.thermalEvents)} />
        <Stat label="Replication tier"    value={derived.replicationTier} tone="accent" />
      </div>
    </Panel>
  );
}