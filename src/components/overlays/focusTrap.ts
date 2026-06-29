/**
 * Focus-trap hook.
 *
 * Restricts keyboard focus to a subtree of the document by intercepting
 * Tab and Shift+Tab on focusable descendants. Used by Overlay.tsx so
 * screen-reader and keyboard-only users can't accidentally focus the
 * gameplay tree behind a modal.
 *
 * Restores the previously focused element on deactivation so returning
 * from the modal lands the user where they were.
 */

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), '
  + 'input:not([disabled]), textarea:not([disabled]), select:not([disabled])';

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first focusable element inside the trap on activation,
    // so a screen reader announces the trap contents immediately.
    const initialFocus = () => {
      const candidates = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const target = candidates[0] ?? root;
      target.focus();
    };
    initialFocus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === firstEl || !root.contains(active))) {
        lastEl.focus();
        e.preventDefault();
      } else if (!e.shiftKey && (active === lastEl || !root.contains(active))) {
        firstEl.focus();
        e.preventDefault();
      }
    };

    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("keydown", onKey);
      // Restore focus to whatever was focused before the trap activated,
      // so closing the modal returns the user to the gameplay controls.
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return ref;
}
