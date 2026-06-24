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

  return (
    <Overlay>
      <div className={`${styles.box} ${styles.lose}`}>
        <pre className={`${styles.ascii} ${styles.asciiSmall}`}>{LOSE_LOGO}</pre>
        <h2>THERMAL RUNAWAY</h2>
        <p>{loseReason}</p>
        <p>Run survived: <b>{loseStats}</b></p>
        <button className={styles.btn} onClick={restart}>► TRY AGAIN</button>
      </div>
    </Overlay>
  );
}