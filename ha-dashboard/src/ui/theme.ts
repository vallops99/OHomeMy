/**
 * Token access for components.
 *
 * Components read tokens through `t` rather than importing `buildTokens`, so
 * retuning KNOBS stays a single edit in `theme/tokens.ts` (ADR-0001) and no
 * component ever hardcodes a colour, size or radius.
 */
import { buildTokens } from '../theme/tokens';

export const t = buildTokens();
export type { Tokens } from '../theme/tokens';

/** Surface colour for a tile, given what it is doing. */
export function surfaceFor(opts: { active?: boolean; unavailable?: boolean; strong?: boolean }) {
  if (opts.unavailable) return t.color.faultSurface;
  if (opts.active) return opts.strong ? t.color.activeStrong : t.color.active;
  return t.color.surface;
}

/** Text colour that is guaranteed readable on `surfaceFor` with the same opts. */
export function onSurfaceFor(opts: { active?: boolean; unavailable?: boolean; strong?: boolean }) {
  if (opts.unavailable) return t.color.fault;
  if (opts.active) return opts.strong ? t.color.onActiveStrong : t.color.onActive;
  return t.color.textPrimary;
}
