/**
 * Reusable panel container.
 *
 * A bordered, titled card used as the base for nearly every UI group in
 * the game. Pure presentation — no state, no callbacks.
 */

import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./Panel.module.css";

interface PanelProps {
  title: string;
  /** Optional right-aligned element in the title row. */
  titleRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, titleRight, children, className }: PanelProps) {
  return (
    <section className={clsx(styles.panel, className)}>
      <header className={styles.head}>
        <span className={styles.title}>{title}</span>
        {titleRight}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}