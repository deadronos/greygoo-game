/**
 * A single allocation row (one morph: harvester / radiator / seeker).
 */

import styles from "./Allocation.module.css";

interface AllocationRowProps {
  name: string;
  desc: string;
  count: number;
  /** True when at least one idle nanite is available to assign. */
  canAdd: boolean;
  /** True when this morph has at least one nanite to pull back. */
  canRemove: boolean;
  onChange: (delta: number) => void;
}

export function AllocationRow({ name, desc, count, canAdd, canRemove, onChange }: AllocationRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <div className={styles.name}>
          {name} <span className={styles.pip}>×{count}</span>
        </div>
        <div className={styles.desc}>{desc}</div>
      </div>
      <div className={styles.controls}>
        <button
          onClick={() => onChange(-1)}
          disabled={!canRemove}
          aria-label={`Decrease ${name}`}
        >−</button>
        <span className={styles.count} aria-live="polite">{count}</span>
        <button
          onClick={() => onChange(1)}
          disabled={!canAdd}
          aria-label={`Increase ${name}`}
        >+</button>
      </div>
    </div>
  );
}