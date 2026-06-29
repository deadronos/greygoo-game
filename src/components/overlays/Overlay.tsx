/**
 * Base overlay container.
 *
 * Adds dialog semantics (`role="dialog"`, `aria-modal="true"`) and
 * focus trapping so screen-reader and keyboard-only users can't focus
 * the gameplay tree behind the modal.
 */

import type { ReactNode } from "react";

import { useFocusTrap } from "./focusTrap";
import styles from "./Overlay.module.css";

interface OverlayProps {
  children: ReactNode;
  /** Accessible label for the dialog region. Defaults to "dialog". */
  label?: string;
  /**
   * When false, the focus trap is dormant and the overlay renders as a
   * plain region. Useful for the `play` screen's React tree which
   * doesn't need a trap.
   */
  active?: boolean;
}

export function Overlay({ children, label = "dialog", active = true }: OverlayProps) {
  const ref = useFocusTrap<HTMLDivElement>(active);
  return (
    <div
      ref={ref}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}