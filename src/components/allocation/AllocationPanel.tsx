/**
 * Allocation panel — three morph rows + summary footer.
 */

import { Panel } from "@/components/panels/Panel";
import { selectAllocationSlice, shallow, useGameStore } from "@/store/gameStore";

import { AllocationRow } from "./AllocationRow";
import styles from "./Allocation.module.css";

const MORPHS = [
  {
    key: "harvester" as const,
    name: "HARVESTERS",
    desc: "Break organic bonds. Yield biomass & heat.",
  },
  {
    key: "radiator" as const,
    name: "RADIATORS",
    desc: "Fractal surface area. Dissipate heat passively.",
  },
  {
    key: "seeker" as const,
    name: "HUNTER-SEEKERS",
    desc: "Combat white cells, EMP warheads, Blue Goo.",
  },
];

export function AllocationPanel() {
  // Subscribe to the {allocation, nanites, autoAlloc} slice only — biomass
  // / energy / threats etc. don't reach this component, so it skips
  // re-renders on unrelated tick-driven state updates.
  const { allocation, nanites } = useGameStore(
    selectAllocationSlice,
    shallow,
  );
  const changeAlloc = useGameStore((s) => s.changeAlloc);

  const total = allocation.harvester + allocation.radiator + allocation.seeker;

  return (
    <Panel title="NANITE ALLOCATION">
      <div className={styles.list}>
        {MORPHS.map((m) => (
          <AllocationRow
            key={m.key}
            name={m.name}
            desc={m.desc}
            count={allocation[m.key]}
            canAdd={total < nanites}
            canRemove={allocation[m.key] > 0}
            onChange={(delta) => changeAlloc(m.key, delta)}
          />
        ))}
        <div className={styles.footer}>
          <span>Unallocated: <b>{nanites - total}</b></span>
          <span>Total swarm: <b>{nanites}</b></span>
        </div>
      </div>
    </Panel>
  );
}