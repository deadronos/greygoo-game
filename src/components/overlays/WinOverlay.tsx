/**
 * Win overlay.
 */

import { useGameStore } from "@/store/gameStore";

import { Overlay } from "./Overlay";
import styles from "./Overlay.module.css";

const WIN_LOGO = `
  ███████ ██   ██  █████  ██   ██  ██████ ███████
  ██      ██   ██ ██   ██  ██ ██  ██      ██
  █████   ███████ ███████   ███   ██      █████
  ██      ██   ██ ██   ██  ██ ██  ██      ██
  ███████ ██   ██ ██   ██ ██   ██  ██████ ███████
`;

export function WinOverlay() {
  const winStats = useGameStore((s) => s.winStats);
  const restart = useGameStore((s) => s.restart);

  return (
    <Overlay>
      <div className={`${styles.box} ${styles.win}`}>
        <pre className={`${styles.ascii} ${styles.asciiSmall}`}>{WIN_LOGO}</pre>
        <h2>ECOPHAGY ACHIEVED</h2>
        <p>The biosphere is silent. The thermal ceiling was never the enemy—<em>you</em> were.</p>
        <p>Final run: <b>{winStats}</b></p>
        <button className={styles.btn} onClick={restart}>► BEGIN AGAIN</button>
      </div>
    </Overlay>
  );
}