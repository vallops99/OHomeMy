/**
 * The design tokens as CSS custom properties, for every component a Widget
 * draws through (#62, ADR-0015). `t` (`theme.ts`) holds them as values,
 * fixed at load and sized by the device; a Widget must follow its
 * Dashboard's Theme and mode, and size itself by its own box, so these
 * components read `v` instead (`widgets/look.test.ts` checks that they do).
 *
 * `v` keeps `t`'s shape, so a component reads `v.color.accent` where it read
 * `t.color.accent`, and each value is one of three kinds:
 *
 * - Colour, radius, spacing and Casa Panel's type styles are the Theme's
 *   custom properties under Casa Panel's names: `v.color.accent` is
 *   `var(--accent)`, which `themeCss` sets per Theme and mode. ADR-0001's
 *   old colour names are gone; use Casa Panel's.
 * - The sizes the wall and the phone used to differ in -- the older type
 *   scale (`v.font.body`, `glanceM`, ...), the touch floor, the tile's cap
 *   -- are box-scale properties, `--ohm-<group>-<name>`. Inside a Widget its
 *   box sets them (`BOX_SCALE_CSS`). Everywhere else, the label-driven
 *   Dashboard and an overlay that covers the whole screen, the page root sets
 *   them by device (`HakitTheme`): there the screen is the box.
 * - Sizes the wall and the phone always agreed on, which the Theme does not
 *   name (`v.space.md`, `v.touch.primary`), are plain lengths.
 *
 * Every value is a CSS string, `14px` rather than `14`: in arithmetic it
 * goes in a `calc()`, and in a template it takes no `px` of its own.
 */
import { CASA, buildTokens, kebab, type Tokens } from '../theme/tokens';
import { lineColor, onSurfaceColor, surfaceColor, type SurfaceOpts } from './surface';

const ref = (name: string) => `var(--${name})`;
const px = (n: number) => `${n}px`;

type Refs<T> = { readonly [K in keyof T]: string };
const refs = <T extends object>(values: T, name: (key: string) => string): Refs<T> =>
  Object.fromEntries(Object.keys(values).map(k => [k, ref(name(k))])) as Refs<T>;

const WALL = buildTokens('wall');
const ARM = buildTokens('arm');

/**
 * The sizes components take that `t` holds and the Theme does not: the box
 * sets each one the wall and the phone differ in, and the rest are lengths.
 */
const SIZED = {
  font: ['body', 'caption', 'glanceM', 'glanceL', 'glanceXL'],
  touch: ['primary', 'floor'],
  layout: ['rowRoom', 'popupClose', 'tileMaxH', 'mediaBarMinW'],
} as const satisfies { [G in keyof Tokens]?: readonly (keyof Tokens[G])[] };

type Sized = typeof SIZED;
type Group = keyof Sized;
const sizeOf = (tokens: Tokens, group: Group, key: string) => (tokens[group] as Record<string, number>)[key];
const boxScaled = (group: Group, key: string) => sizeOf(WALL, group, key) !== sizeOf(ARM, group, key);
const boxName = (group: Group, key: string) => `ohm-${group}-${kebab(key)}`;

function sized<G extends Group>(group: G): Record<Sized[G][number], string> {
  return Object.fromEntries(
    SIZED[group].map(key => [key, boxScaled(group, key) ? ref(boxName(group, key)) : px(sizeOf(WALL, group, key))])
  ) as Record<Sized[G][number], string>;
}

export const v = {
  color: {
    ...refs(CASA.color, kebab),
    /**
     * Dims the panel behind something over it. Not a Casa Panel token: its
     * ground at ADR-0001's 72%, as `t.color.backdrop` is, so it follows the
     * Theme's ground.
     */
    backdrop: `color-mix(in srgb, ${ref('bg')} 72%, transparent)`,
  },
  font: { family: ref('font-sans'), ...sized('font') },
  type: Object.fromEntries(
    Object.keys(CASA.type).map(name => {
      const style = (part: string) => ref(`type-${kebab(name)}-${part}`);
      return [name, { size: style('size'), lineHeight: style('line'), weight: style('weight'), letterSpacing: style('tracking') }];
    })
  ) as Record<keyof typeof CASA.type, { size: string; lineHeight: string; weight: string; letterSpacing: string }>,
  /** Casa Panel's numbered steps, then ADR-0001's named ones the components were measured with. */
  space: {
    ...refs(CASA.space, k => `space-${k}`),
    xs: ref('space-1'),
    sm: ref('space-2'),
    md: px(WALL.space.md),
    lg: px(WALL.space.lg),
    xl: px(WALL.space.xl),
  },
  radius: { ...refs(CASA.radius, k => `radius-${kebab(k)}`), sm: ref('radius-control') },
  size: refs(CASA.size, kebab),
  touch: sized('touch'),
  layout: sized('layout'),
};

/** The box-scale properties, with their values in one token set. */
export function boxScaleVariables(tokens: Tokens): string {
  return (Object.keys(SIZED) as Group[])
    .flatMap(group =>
      SIZED[group].filter(key => boxScaled(group, key)).map(key => `--${boxName(group, key)}: ${px(sizeOf(tokens, group, key))};`)
    )
    .join(' ');
}

/**
 * The widest box that takes the phone's sizes. A box, not a screen, so it
 * holds in the Builder's preview and on any device; the value is where the
 * two met on the screens they were drawn for (measured on the real app,
 * #62). On the wall, at 1280x800 on a 12-column grid, the narrowest Widget
 * drawn through these components is two columns, 194 px; on a 390 px phone
 * the widest such one on that Dashboard is 114 px, and half of a 2-column
 * Dashboard's width is 177 px. 179 keeps all three as they were. A
 * full-width Widget on a phone (366 px) now takes the wall's sizes, which
 * its box has room for.
 */
export const NARROW_BOX_MAX_W = 179;

/**
 * Each Widget's box sets its own scale (`.ohm-widget` is the size container
 * `widget`, `renderer/grid.ts`), so nothing inside it inherits the page's
 * device-sized one. A Group's members share the Group's box. Put in the
 * shadow root with the Widget kinds' CSS (`widgets/registry.ts`).
 */
export const BOX_SCALE_CSS = `
  .ohm-widget > * { ${boxScaleVariables(WALL)} }
  @container widget (max-width: ${NARROW_BOX_MAX_W}px) {
    .ohm-widget > * { ${boxScaleVariables(ARM)} }
  }
`;

/** Surface colour for a tile, given what it is doing. */
export const surfaceFor = (opts: SurfaceOpts) => v.color[surfaceColor(opts)];

/** Text colour that is guaranteed readable on `surfaceFor` with the same opts. */
export const onSurfaceFor = (opts: SurfaceOpts) => v.color[onSurfaceColor(opts)];

/** Border colour for `surfaceFor` with the same opts. */
export const lineFor = (opts: SurfaceOpts) => v.color[lineColor(opts)];
