/**
 * Token access for components.
 *
 * Components read tokens through `t` rather than importing `buildTokens`, so
 * the design system's values reach every component from one port in
 * `theme/tokens.ts` (ADR-0013) and no component ever hardcodes a colour, size
 * or radius.
 *
 * `t` is values, fixed at load and sized by the device, so nothing a Widget
 * draws through reads it: those components read `vars.ts`, which follows the
 * Dashboard's Theme and the Widget's box (#62, `widgets/look.test.ts`).
 */
import { buildTokens } from '../theme/tokens';
import { isPhone } from './device';
import { lineColor, onSurfaceColor, surfaceColor, type SurfaceOpts } from './surface';

/** Sized for the wall, or, on a phone, for arm's length (ADR-0011). */
export const t = buildTokens(isPhone ? 'arm' : 'wall');
export type { Tokens } from '../theme/tokens';
export type { SurfaceOpts } from './surface';

/** Surface colour for a tile, given what it is doing. */
export const surfaceFor = (opts: SurfaceOpts) => t.color[surfaceColor(opts)];

/** Text colour that is guaranteed readable on `surfaceFor` with the same opts. */
export const onSurfaceFor = (opts: SurfaceOpts) => t.color[onSurfaceColor(opts)];

/** Border colour for `surfaceFor` with the same opts. */
export const lineFor = (opts: SurfaceOpts) => t.color[lineColor(opts)];
