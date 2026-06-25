/**
 * A single allocation row (one morph: harvester / radiator / seeker).
 */

import styles from "./Allocation.module.css";
import type { MorphKey } from "@/systems/types";

interface AllocationRowProps {
  morph: MorphKey;
  name: string;
  desc: string;
  count: number;
  onChange: (delta: number) => void;
}

export function AllocationRow({ name, desc, count, onChange }: AllocationRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <div className={styles.name}>
          {name} <span className={styles.pip}>×{count}</span>
        </div>
        <div className={styles.desc}>{desc}</div>
      </div>
      <div className={styles.controls}>
        <button onClick={() => onChange(-1)}>−</button>
        <span className={styles.count}>{count}</span>
        <button onClick={() => onChange(1)}>+</button>
      </div>
    </div>
  );
}