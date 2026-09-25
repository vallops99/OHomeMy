/**
 * What makes a bare element a button when it has somewhere to go, and
 * nothing at all when it has not: a role, keyboard operability, a pointer.
 * For surfaces that are not `Tile`s -- the Hero and the Stats, whose tap
 * opens a Page only when a Page is there to open (#32). With no handler the
 * element is not a control and does not look like one.
 */
import type { HTMLAttributes, KeyboardEvent } from 'react';

export function pressable(onPress: (() => void) | undefined): HTMLAttributes<HTMLElement> {
  if (onPress === undefined) return {};
  return {
    role: 'button',
    tabIndex: 0,
    onClick: () => onPress(),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPress();
      }
    },
    style: { cursor: 'pointer' },
  };
}
