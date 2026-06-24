/**
 * Resource card.
 *
 * Single resource display: icon + name + value + rate.
 */

import clsx from "clsx";
import type { ReactNode } from "react";

import { useGameStore, selectPulses } from "@/store/gameStore";
import type { ResourceKey } from "@/systems/types";

import styles from "./ResourceCard.module.css";

interface ResourceCardProps {
  /** Pulse key. Nanites uses the literal "nanites". */
  resource: ResourceKey | "nanites";
  icon: ReactNode;
  colorVar: string;        // CSS color variable, e.g. "var(--bio)"
  name: string;
  value: string;
  rate: string;
}

export function ResourceCard({ resource, icon, colorVar, name, value, rate }: ResourceCardProps) {
  const pulses = useGameStore(selectPulses);
  // A pulse event for this resource triggers a CSS animation class.
  const isPulsing = pulses.some((p) => p.key === resource);

  return (
    <div
      data-key={resource}
      className={clsx(styles.card, isPulsing && styles.pulse)}
      style={{ color: colorVar }}
    >
      <div className={styles.icon}>{icon}</div>
      <div className={styles.info}>
        <div className={styles.name}>{name}</div>
        <div className={styles.value}>{value}</div>
        <div className={styles.rate}>{rate}</div>
      </div>
    </div>
  );
}