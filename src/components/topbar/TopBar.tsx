/**
 * Top header: brand + status pills + save/reset buttons.
 */

import { selectSaveFlash, selectState, useGameStore } from "@/store/gameStore";
import { MiniButton } from "@/components/panels/Button";
import { fmtTime } from "@/systems/format";
import { AWARENESS_LABELS } from "@/systems/constants";
import { pickBand } from "@/systems/format";

import styles from "./TopBar.module.css";

export function TopBar() {
  const state = useGameStore(selectState);
  const saveFlash = useGameStore(selectSaveFlash);
  const forceSave = useGameStore((s) => s.forceSave);
  const wipeAndRestart = useGameStore((s) => s.wipeAndRestart);

  const facility = pickBand(AWARENESS_LABELS, state.awareness);

  function onReset() {
    if (window.confirm("Wipe the swarm and start over? This deletes your save.")) {
      wipeAndRestart();
    }
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.mark}>Ξ</span>
        <div>
          <div className={styles.title}>THE ENTROPIC DEVOURER</div>
          <div className={styles.sub}>
            Patient Zero · Lab 7-Alpha ·{" "}
            <span style={{ color: facility.color }}>{facility.label}</span>
          </div>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.pill}>T+{fmtTime(state.elapsed)}</div>
        <div className={styles.pill}>BIOSPHERE {(100 - state.ecophagy).toFixed(1)}%</div>
        <MiniButton onClick={forceSave} title="Force save">SAVE</MiniButton>
        <MiniButton variant="danger" onClick={onReset} title="Reset run">RESET</MiniButton>
        <div className={styles.saveStatus}>Save: <b>{saveFlash}</b></div>
      </div>
    </header>
  );
}