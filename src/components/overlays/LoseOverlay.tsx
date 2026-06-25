/**
 * Lose overlay.
 */

import { useGameStore } from "@/store/gameStore";

import { Overlay } from "./Overlay";
import styles from "./Overlay.module.css";

const LOSE_LOGO = `
  ████████ ██   ██  ███████ ██████  ███    ███  █████  ██
     ██    ██   ██  ██      ██   ██ ████  ████ ██   ██ ██
     ██    ███████  █████   ██████  ██ ████ ██ ███████ ██
     ██    ██   ██  ██      ██   ██ ██  ██  ██ ██   ██ ██
     ██    ██   ██  ███████ ██   ██ ██      ██ ██   ██ ███████
`;

export function LoseOverlay() {
  const loseReason = useGameStore((s) => s.loseReason);
  const loseStats = useGameStore((s) => s.loseStats);
  const restart = useGameStore((s) => s.restart);

  // The title used to be hardcoded "THERMAL RUNAWAY" even when the run
  // actually ended to human countermeasures (heat below the threshold).
  // Derive it from the reason the simulation recorded so the H2 and the
  // prose line agree on the cause of death.
  const isThermal = /annealed|thermal|melt|heat/i.test(loseReason);

  return (
    <Overlay>
      <div className={`${styles.box} ${styles.lose}`}>
        <pre className={`${styles.ascii} ${styles.asciiSmall}`}>{LOSE_LOGO}</pre>
        <h2>{isThermal ? "THERMAL RUNAWAY" : "SWARM SUBDUED"}</h2>
        <p>{loseReason}</p>
        <p>Run survived: <b>{loseStats}</b></p>
        <button className={styles.btn} onClick={restart}>► TRY AGAIN</button>
      </div>
    </Overlay>
  );
}