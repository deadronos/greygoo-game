/**
 * Label/value pair used in telemetry grids and small captions.
 */

import styles from "./Stat.module.css";

interface StatProps {
  label: string;
  value: string | number;
  /** Optional tone applied to the value text. */
  tone?: "default" | "accent" | "warn" | "danger" | "good";
}

export function Stat({ label, value, tone = "default" }: StatProps) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <b className={`${styles.value} ${styles[tone]}`}>{value}</b>
    </div>
  );
}