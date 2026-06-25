/**
 * Resource grid.
 *
 * Renders all four resources in one row, sourcing values from the store
 * via derived selectors.
 */

import { selectState, selectDerived, shallow, useGameStore } from "@/store/gameStore";
import { fmt, fmtInt } from "@/systems/format";
import type { DerivedStats } from "@/systems/simulation";

import { ResourceCard } from "./ResourceCard";
import styles from "./ResourceGrid.module.css";

export function ResourceGrid() {
  const state = useGameStore(selectState);
  const derived: DerivedStats = useGameStore(selectDerived, shallow);

  const nanitesIdle =
    state.nanites -
    (state.allocation.harvester + state.allocation.radiator + state.allocation.seeker);

  return (
    <section className={styles.grid}>
      <ResourceCard
        resource="biomass"
        icon={<span style={{ color: "var(--bio)" }}>❦</span>}
        colorVar="var(--bio)"
        name="BIOMASS"
        value={fmt(state.biomass)}
        rate={`+${derived.harvesterBiomassRate.toFixed(2)}/s`}
      />
      <ResourceCard
        resource="silicates"
        icon={<span style={{ color: "var(--sil)" }}>▲</span>}
        colorVar="var(--sil)"
        name="SILICATES"
        value={fmt(state.silicates)}
        rate={`+${derived.silicateRate.toFixed(2)}/s`}
      />
      <ResourceCard
        resource="metals"
        icon={<span style={{ color: "var(--met)" }}>◆</span>}
        colorVar="var(--met)"
        name="REFINED METALS"
        value={fmt(state.metals)}
        rate={
          state.canRefine
            ? `+${derived.metalRate.toFixed(2)}/s`
            : `locked`
        }
      />
      <ResourceCard
        resource="nanites"
        icon={<span style={{ color: "var(--nan)" }}>✦</span>}
        colorVar="var(--nan)"
        name="NANITES"
        value={fmtInt(state.nanites)}
        rate={nanitesIdle > 0 ? `${nanitesIdle} idle` : "fully alloc."}
      />
    </section>
  );
}