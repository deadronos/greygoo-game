/**
 * Intro overlay — title screen + resume button.
 */

import clsx from "clsx";

import { selectHasSave, useGameStore } from "@/store/gameStore";

import { Overlay } from "./Overlay";
import styles from "./Overlay.module.css";

const LOGO = `
   _____ _   _ _____ ____  ____  ____   ___  __  __ _____ ____  _____ _____
  | ____| \\ | |_   _|  _ \\/ ___||  _ \\ / _ \\|  \\/  | ____|  _ \\ ____|_   _|
  |  _| |  \\| | | | | |_) \\___ \\| |_) | | | | |\\/| |  _| | |_) |  _|   | |
  | |___| |\\  | | | |  _ < ___) |  __/| |_| | |  | | |___|  _ <| |___  | |
  |_____|_| \\_| |_| |_| \\_\\____/|_|    \\___/|_|  |_|_____|_| \\_\\_____| |_|
       ____             ____                      _
      |  _ \\  _____   _|  _ \\  ___  _ __  _   _ | |    ___   ___
      | | | |/ _ \\ \\ / / | | | / _ \\| '_ \\| | | || |   / _ \\ / _ \\
      | |_| |  __/\\ V /| |_| |  __/| | | | |_| || |__| (_) | (_) |
      |____/ \\___|\\_/ |____/ \\___||_| |_|\\__, ||_____\\___/ \\___/
                                          |___/
`;

export function IntroOverlay() {
  const hasSave = useGameStore(selectHasSave);
  const beginNewGame = useGameStore((s) => s.beginNewGame);
  const resumeGame = useGameStore((s) => s.resumeGame);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (hasSave) resumeGame();
      else beginNewGame();
    }
  }

  return (
    <Overlay>
      <div className={styles.box} onKeyDown={onKeyDown} tabIndex={0}>
        <pre className={styles.ascii}>{LOGO}</pre>

        <div className={styles.meta}>
          <p><span className={styles.key}>FILE:</span> GREY-GOO / THERMAL-CRISIS / CLASS-OMEGA</p>
          <p><span className={styles.key}>SUBJECT:</span> Nanite Swarm "Patient Zero" — SELF-REPLICATING</p>
          <p><span className={styles.key}>FACILITY:</span> Containment Lab 7-Alpha, Sector 13</p>
          <p><span className={styles.key}>DIRECTIVE:</span> Achieve ecophagy. Consume the biosphere.</p>
          <p><span className={styles.key}>PRIME ENEMY:</span> The Laws of Thermodynamics.</p>
        </div>

        <p className={styles.lore}>
          You are <em>Patient Zero</em>—the first self-replicating nanite to breach the
          thermodynamic ceiling. Every bond you break, you burn. Every gram you consume,
          you heat. If your swarm temperature rises past the threshold at which your
          own diamondoid chassis anneal, you are not merely defeated—you simply <em>stop</em>.
          You must <strong>balance your diet</strong>: organic biomass for explosive
          replication, but it cooks you. Silicates and refined metals absorb heat and
          build cooler structures, but they starve you of energy. Allocate your swarm.
          Outwit the immune response. Consume. Multiply. End the warm biosphere.
        </p>

        <button className={styles.btn} onClick={beginNewGame}>
          ► BREACH CONTAINMENT
        </button>
        <button
          className={clsx(styles.btn, !hasSave && "hidden")}
          onClick={resumeGame}
        >
          ► RESUME PREVIOUS RUN
        </button>
      </div>
    </Overlay>
  );
}