/**
 * Secondary actions panel — MINE / REFINE / REPLICATE.
 */

import { Panel } from "@/components/panels/Panel";
import { ActionButton } from "@/components/panels/Button";
import { useGameStore, selectDerived, selectState } from "@/store/gameStore";
import {
  METAL_REFINE_ENERGY,
  METAL_REFINE_SILICATE,
  METAL_HEAT_ABSORB,
  REPLICATE_BIOMASS_COST,
  SILICATE_HEAT_ABSORB,
  SILICATE_MINE_ENERGY,
} from "@/systems/constants";

import styles from "./SecondaryActions.module.css";

export function SecondaryActions() {
  const state = useGameStore(selectState);
  const derived = useGameStore(selectDerived);
  const clickMine = useGameStore((s) => s.clickMine);
  const clickRefine = useGameStore((s) => s.clickRefine);
  const clickReplicate = useGameStore((s) => s.clickReplicate);

  const canMine = state.energy >= SILICATE_MINE_ENERGY;
  const canRefine =
    state.canRefine &&
    state.silicates >= METAL_REFINE_SILICATE &&
    state.energy >= METAL_REFINE_ENERGY;
  const canReplicate =
    state.energy >= derived.replicatorCost && state.biomass >= REPLICATE_BIOMASS_COST;

  return (
    <Panel title="SECONDARY ACTIONS">
      <div className={styles.list}>
        <ActionButton
          tone="sil"
          name="MINE SILICATE"
          sub={`−${SILICATE_MINE_ENERGY}e · +1 sil · −${SILICATE_HEAT_ABSORB} heat`}
          title="Endothermic. Absorbs heat. (M)"
          unavailable={!canMine}
          onClick={clickMine}
        />
        <ActionButton
          tone="met"
          name="REFINE METAL"
          sub={`−${METAL_REFINE_SILICATE} sil −${METAL_REFINE_ENERGY}e · +1 met · −${METAL_HEAT_ABSORB} heat`}
          title="Requires Foundry Protocol upgrade. (Shift+R)"
          locked={!state.canRefine}
          unavailable={state.canRefine && !canRefine}
          onClick={clickRefine}
        />
        <ActionButton
          tone="repl"
          name="REPLICATE"
          sub={`${derived.replicatorCost}e + ${REPLICATE_BIOMASS_COST}bio · +0.2 heat`}
          title="Grow the swarm."
          unavailable={!canReplicate}
          onClick={clickReplicate}
        />
      </div>
    </Panel>
  );
}