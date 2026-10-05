import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contrast } from '../theme/color';
import { lineFor, onSurfaceFor, surfaceFor, t, type SurfaceOpts } from './theme';

const ALL: SurfaceOpts[] = [];
for (const active of [false, true])
  for (const unavailable of [false, true])
    for (const strong of [false, true]) for (const filled of [false, true]) ALL.push({ active, unavailable, strong, filled });

test('every surface a tile can take has a foreground that reads at 4.5:1', () => {
  for (const opts of ALL) {
    const ratio = contrast(onSurfaceFor(opts), surfaceFor(opts));
    assert.ok(ratio >= 4.5, `${JSON.stringify(opts)}: ${ratio.toFixed(2)}:1`);
  }
});

test('the accent fills only what is on', () => {
  for (const opts of ALL) {
    if (surfaceFor(opts) === t.color.accent) assert.ok(opts.active && !opts.unavailable, JSON.stringify(opts));
  }
});

test('a control filled while off takes the primary fill, not the accent', () => {
  assert.equal(surfaceFor({ filled: true }), t.color.primary);
  assert.equal(surfaceFor({ filled: true, active: true, strong: true }), t.color.accent);
});

test('an on tile that is not a filled control is lit, with a lit border', () => {
  assert.equal(surfaceFor({ active: true }), t.color.litSurface);
  assert.equal(lineFor({ active: true }), t.color.litLine);
});

test('a Fault wins over every other state', () => {
  for (const opts of ALL.filter(o => o.unavailable)) {
    assert.equal(surfaceFor(opts), t.color.alertSurface);
    assert.equal(onSurfaceFor(opts), t.color.alert);
    assert.equal(lineFor(opts), t.color.alertLine);
  }
});
