import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CASA, buildTokens, casaVariables } from '../theme/tokens';
import { lineColor, onSurfaceColor, surfaceColor, type SurfaceOpts } from './surface';
import { BOX_SCALE_CSS, NARROW_BOX_MAX_W, boxScaleVariables, lineFor, onSurfaceFor, surfaceFor, v } from './vars';

const WALL = buildTokens('wall');
const ARM = buildTokens('arm');

/** Every string in `v`, with where it is. */
function leaves(node: unknown, path = 'v'): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, n]) => leaves(n, `${path}.${k}`));
}

test('every custom property v reads is one the theme or the box scale sets', () => {
  const boxed = [...boxScaleVariables(WALL).matchAll(/--([a-z0-9-]+):/g)].map(m => m[1]);
  const set = new Set([...Object.keys(casaVariables()), ...boxed]);
  for (const [path, value] of leaves(v)) {
    for (const [, name] of value.matchAll(/var\(--([a-z0-9-]+)/g)) assert.ok(set.has(name), `${path}: --${name} is never set`);
  }
});

test('colour, radius, spacing and type are the theme custom properties, under Casa Panel names', () => {
  for (const name of Object.keys(CASA.color.dark) as (keyof typeof CASA.color.dark)[]) assert.match(v.color[name], /^var\(--[a-z-]+\)$/);
  assert.equal(v.color.surfaceTile, 'var(--surface-tile)');
  assert.equal(v.radius.tile, 'var(--radius-tile)');
  assert.equal(v.space[3], 'var(--space-3)');
  assert.equal(v.type.label.size, 'var(--type-label-size)');
  assert.equal(v.font.family, 'var(--font-sans)');
  assert.equal(v.size.targetControl, 'var(--target-control)');
});

test('a size the wall and the phone differ in follows the box; one they agree on is a plain length', () => {
  for (const group of ['font', 'touch', 'layout'] as const) {
    for (const [key, value] of Object.entries(v[group])) {
      if (key === 'family') continue;
      const wall = (WALL[group] as Record<string, unknown>)[key];
      const arm = (ARM[group] as Record<string, unknown>)[key];
      if (wall === arm) assert.equal(value, `${wall}px`, `v.${group}.${key}`);
      else assert.match(value, /^var\(--ohm-/, `v.${group}.${key} differs by device, so the box must set it`);
    }
  }
});

test('a box takes the wall sizes, and a narrow one the phone sizes', () => {
  assert.match(boxScaleVariables(WALL), /--ohm-font-glance-m: 22px;/);
  assert.match(boxScaleVariables(ARM), /--ohm-font-glance-m: 19px;/);
  const [wide, narrow] = BOX_SCALE_CSS.split('@container');
  assert.ok(wide.includes(boxScaleVariables(WALL)));
  assert.ok(narrow.startsWith(` widget (max-width: ${NARROW_BOX_MAX_W}px)`));
  assert.ok(narrow.includes(boxScaleVariables(ARM)));
});

test("a tile's colours are the same roles t gives, as custom properties", () => {
  const opts: SurfaceOpts = { active: true, strong: true };
  assert.equal(surfaceFor(opts), v.color[surfaceColor(opts)]);
  assert.equal(onSurfaceFor(opts), v.color[onSurfaceColor(opts)]);
  assert.equal(lineFor(opts), v.color[lineColor(opts)]);
  assert.equal(surfaceFor({ active: true }), 'var(--lit-surface)');
});
