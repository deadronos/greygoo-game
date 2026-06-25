/**
 * Themed buttons.
 *
 * Three variants:
 *  - `mini`: tiny pill button for topbar (SAVE / RESET).
 *  - `action`: secondary-action button (MINE / REFINE / REPLICATE).
 *  - `bond`:   the giant circular "BREAK BOND" primary button.
 *
 * All visual; all behavior is via `onClick`.
 */

import clsx from "clsx";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./Button.module.css";

interface MiniButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "danger";
  children: ReactNode;
}

export function MiniButton({ variant = "default", className, children, ...rest }: MiniButtonProps) {
  return (
    <button
      className={clsx(styles.mini, variant === "danger" && styles.danger, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

type ActionTone = "sil" | "met" | "repl";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone: ActionTone;
  name: string;
  sub: string;
  locked?: boolean;
  unavailable?: boolean;
}

export function ActionButton({
  tone,
  name,
  sub,
  locked,
  unavailable,
  className,
  ...rest
}: ActionButtonProps) {
  return (
    <button
      className={clsx(
        styles.action,
        styles[tone],
        locked && styles.locked,
        unavailable && styles.unavailable,
        className,
      )}
      disabled={locked || unavailable}
      {...rest}
    >
      <span className={styles.actionName}>{name}</span>
      <span className={styles.actionSub}>{sub}</span>
    </button>
  );
}

interface BondButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  main: string;
  sub: string;
  cooling?: boolean;
}

export const BondButton = forwardRef<HTMLButtonElement, BondButtonProps>(function BondButton(
  { main, sub, cooling, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(styles.bond, cooling && styles.cooling, className)}
      {...rest}
    >
      <span className={styles.ring} />
      <span className={clsx(styles.ring, styles.ring2)} />
      <span className={styles.text}>
        <span className={styles.main}>{main}</span>
        <span className={styles.sub}>{sub}</span>
      </span>
    </button>
  );
});