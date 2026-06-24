/**
 * A horizontal gauge bar with label/value/hint.
 *
 * Pure presentation. Caller supplies everything.
 */

import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";

import styles from "./Gauge.module.css";

interface GaugeProps {
  label: string;
  valueText: string;
  /** 0-100. Values >100 are clamped for the bar but the hint stays. */
  fillPercent: number;
  hint?: ReactNode;
  variant: "heat" | "eco" | "awareness";
  /** Optional inline style for the fill bar background. */
  fillStyle?: CSSProperties;
  small?: boolean;
}

export function Gauge({
  label,
  valueText,
  fillPercent,
  hint,
  variant,
  fillStyle,
  small,
}: GaugeProps) {
  return (
    <div className={styles.gauge}>
      <div className={styles.labelRow}>
        <span>{label}</span>
        <span className={styles.value}>{valueText}</span>
      </div>
      <div className={clsx(styles.bar, small && styles.small)}>
        <div
          className={clsx(styles.fill, variant && styles[variant])}
          style={{ width: `${Math.max(0, Math.min(100, fillPercent))}%`, ...fillStyle }}
        />
      </div>
      {hint !== undefined && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}