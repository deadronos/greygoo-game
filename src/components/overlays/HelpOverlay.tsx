/**
 * In-game keyboard cheatsheet.
 *
 * Modal accessible via `?` during gameplay. Lists every binding
 * listed in the README under "Controls" so players don't have to
 * leave the game to learn the keymap.
 */

import { useGameStore } from "@/store/gameStore";

import { Overlay } from "./Overlay";
import styles from "./Overlay.module.css";

interface KeyRow {
  keys: string[];
  action: string;
}

const SECTIONS: { title: string; rows: KeyRow[] }[] = [
  {
    title: "PRIMARY",
    rows: [
      { keys: ["B", "Space"], action: "Break a bond (primary action)" },
      { keys: ["M"],         action: "Mine silicates (endothermic)" },
      { keys: ["Shift+R"],   action: "Refine metals (needs Foundry upgrade)" },
    ],
  },
  {
    title: "ALLOCATION",
    rows: [
      { keys: ["H"],         action: "Allocate +1 harvester" },
      { keys: ["C"],         action: "Allocate +1 radiator (cooling)" },
      { keys: ["S"],         action: "Allocate +1 seeker" },
      { keys: ["Shift+H"],   action: "Pull −1 harvester" },
      { keys: ["Shift+C"],   action: "Pull −1 radiator" },
      { keys: ["Shift+S"],   action: "Pull −1 seeker" },
    ],
  },
  {
    title: "META",
    rows: [
      { keys: ["?"],         action: "Toggle this cheatsheet" },
      { keys: ["Esc"],       action: "Close this cheatsheet" },
      { keys: ["Enter"],     action: "Begin (title) / save defaults" },
    ],
  },
];

export function HelpOverlay() {
  const closeHelp = useGameStore((s) => s.closeHelp);

  return (
    <Overlay label="Keyboard cheatsheet">
      <div className={`${styles.box} ${styles.help}`}>
        <h2>KEYBOARD CONTROL</h2>
        <p className={styles.helpLore}>
          Every command documented below is wired straight to the
          gameplay store — no menus, no waiting.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.title} className={styles.helpSection}>
            <h3>{section.title}</h3>
            <table className={styles.helpTable}>
              <tbody>
                {section.rows.map((row) => (
                  <tr key={row.action}>
                    <td className={styles.helpKeys}>
                      {row.keys.map((k) => (
                        <kbd key={`${row.action}-${k}`} className={styles.kbd}>{k}</kbd>
                      ))}
                    </td>
                    <td>{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <p className={styles.helpFooter}>
          Right-click on BREAK BOND to mine silicates. Press the same
          letter to undo an allocation.
        </p>

        <button className={styles.btn} onClick={closeHelp} autoFocus>
          ► RESUME SWARM
        </button>
      </div>
    </Overlay>
  );
}
