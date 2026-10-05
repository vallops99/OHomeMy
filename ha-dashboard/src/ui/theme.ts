/**
 * Token access for components.
 *
 * Components read tokens through `t` rather than importing `buildTokens`, so
 * the design system's values reach every component from one port in
 * `theme/tokens.ts` (ADR-0013) and no component ever hardcodes a colour, size
 * or radius.
 */
import { buildTokens } from '../theme/tokens';
import { isPhone } from './device';

/** Sized for the wall, or, on a phone, for arm's length (ADR-0011). */
export const t = buildTokens(isPhone ? 'arm' : 'wall');
export type { Tokens } from '../theme/tokens';

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
export function surfaceFor(opts: SurfaceOpts) {
  if (opts.unavailable) return t.color.alertSurface;
  if (opts.active) return opts.strong || opts.filled ? t.color.accent : t.color.litSurface;
  if (opts.filled) return t.color.primary;
  return t.color.surface;
}

/** Text colour that is guaranteed readable on `surfaceFor` with the same opts. */
export function onSurfaceFor(opts: SurfaceOpts) {
  if (opts.unavailable) return t.color.alert;
  if (opts.active) return opts.strong || opts.filled ? t.color.onAccent : t.color.ink;
  if (opts.filled) return t.color.onPrimary;
  return t.color.ink;
}

/** Border colour for `surfaceFor` with the same opts. */
export function lineFor(opts: SurfaceOpts) {
  if (opts.unavailable) return t.color.alertLine;
  if (opts.active) return opts.strong || opts.filled ? t.color.accent : t.color.litLine;
  if (opts.filled) return t.color.primary;
  return t.color.line;
}
