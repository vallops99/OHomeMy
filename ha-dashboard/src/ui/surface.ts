/**
 * Which of Casa Panel's colours a tile takes, given what it is doing, by
 * name: `theme.ts` reads the name as a value, `vars.ts` as a custom property
 * (#62). One rule, so the two never disagree about what "on" looks like.
 */
import type { CASA } from '../theme/tokens';

export type ColorName = keyof typeof CASA.color;

export type SurfaceOpts = {
  /** The thing is on. */
  active?: boolean;
  unavailable?: boolean;
  /** A filled control: the accent fills it while it is on. */
  strong?: boolean;
  /**
   * Filled even while off -- a gate, which must read as a control from 2 m
   * either way. Off, it takes `primary`, the one high-contrast action of its
   * group; the accent stays for "on" (ADR-0013: colour is state).
   */
  filled?: boolean;
};

/** Surface colour for a tile, given what it is doing. */
export function surfaceColor(opts: SurfaceOpts): ColorName {
  if (opts.unavailable) return 'alertSurface';
  if (opts.active) return opts.strong || opts.filled ? 'accent' : 'litSurface';
  if (opts.filled) return 'primary';
  return 'surface';
}

/** Text colour that is guaranteed readable on `surfaceColor` with the same opts. */
export function onSurfaceColor(opts: SurfaceOpts): ColorName {
  if (opts.unavailable) return 'alert';
  if (opts.active) return opts.strong || opts.filled ? 'onAccent' : 'ink';
  if (opts.filled) return 'onPrimary';
  return 'ink';
}

/** Border colour for `surfaceColor` with the same opts. */
export function lineColor(opts: SurfaceOpts): ColorName {
  if (opts.unavailable) return 'alertLine';
  if (opts.active) return opts.strong || opts.filled ? 'accent' : 'litLine';
  if (opts.filled) return 'primary';
  return 'line';
}
