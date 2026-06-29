/**
 * Telemetry panel — small stats grid.
 *
 * Subscribes to two slices: resources (energy/biomass) and metrics
 * (lifetime counters) — both with shallow equality. Decoupling these
 * means a future counter-only stat doesn't trigger an unrelated
 * resource-pill re-render.
 */

import { Panel } from "@/components/panels/Panel";
import { Stat } from "@/components/panels/Stat";
import {
  selectDerived,
  selectMetrics,
  selectResources,
  shallow,
  useGameStore,
} from "@/store/gameStore";
import { fmt, fmtInt } from "@/systems/format";

import styles from "./Telemetry.module.css";

export function Telemetry() {
  const { energy, biomass } = useGameStore(selectResources, shallow);
  const { bonds, threatsKilled, thermalEvents } = useGameStore(selectMetrics, shallow);
  const derived = useGameStore(selectDerived, shallow);

  return (
    <Panel title="SWARM TELEMETRY">
      <div className={styles.grid}>
        <Stat label="Energy reserves"     value={fmt(energy)} />
        <Stat label="Biomass reserves"    value={fmt(biomass)} />
        <Stat label="Bonds broken"        value={fmtInt(bonds)} />
        <Stat label="Threats neutralized" value={fmtInt(threatsKilled)} />
        <Stat label="Thermal events"      value={fmtInt(thermalEvents)} />
        <Stat label="Replication tier"    value={derived.replicationTier} tone="accent" />
      </div>
    </Panel>
  );
}