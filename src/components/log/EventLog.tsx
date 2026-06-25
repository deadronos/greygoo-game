/**
 * Event log.
 */

import { useEffect, useRef } from "react";

import { Panel } from "@/components/panels/Panel";
import { selectLog, useGameStore } from "@/store/gameStore";

import styles from "./EventLog.module.css";

export function EventLog() {
  const log = useGameStore(selectLog);
  const ref = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new entries.
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log.length]);

  return (
    <Panel title="EVENT LOG">
      <div ref={ref} className={styles.log}>
        {log.map((entry) => (
          <div key={entry.id} className={`${styles.line} ${styles[entry.level] || ""}`}>
            <span className={styles.time}>{entry.time}</span>
            <span className={styles.msg}>{entry.msg}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}