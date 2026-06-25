/**
 * Allocation panel — three morph rows + summary footer.
 */

import { Panel } from "@/components/panels/Panel";
import { selectState, useGameStore } from "@/store/gameStore";

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
  const state = useGameStore(selectState);
  const changeAlloc = useGameStore((s) => s.changeAlloc);

  const total =
    state.allocation.harvester +
    state.allocation.radiator +
    state.allocation.seeker;

  return (
    <Panel title="NANITE ALLOCATION">
      <div className={styles.list}>
        {MORPHS.map((m) => (
          <AllocationRow
            key={m.key}
            name={m.name}
            desc={m.desc}
            count={state.allocation[m.key]}
            canAdd={total < state.nanites}
            canRemove={state.allocation[m.key] > 0}
            onChange={(delta) => changeAlloc(m.key, delta)}
          />
        ))}
        <div className={styles.footer}>
          <span>Unallocated: <b>{state.nanites - total}</b></span>
          <span>Total swarm: <b>{state.nanites}</b></span>
        </div>
      </div>
    </Panel>
  );
}