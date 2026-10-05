/**
 * ADR-0013 keeps ADR-0001's contrast findings as checks against Casa Panel's
 * values: text 4.5:1 on its ground, 3:1 for filled controls and icons. Each
 * pair below is one the design system documents or the panel renders.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contrast, flatten } from './color';
import { CASA, buildTokens, cssVariables } from './tokens';

const c = CASA.color;

const TEXT: [string, keyof typeof c, keyof typeof c][] = [
  ['primary text on the page', 'ink', 'bg'],
  ['primary text on a card', 'ink', 'surface'],
  ['primary text on an off tile', 'ink', 'surfaceTile'],
  ['primary text on a lit tile', 'ink', 'litSurface'],
  ['primary text on a static tile', 'ink', 'surfaceStatic'],
  ['primary text in a well', 'ink', 'surfaceWell'],
  ['a secondary button label', 'ink', 'switchOff'],
  ['chip text', 'inkSoft', 'surface'],
  ['supporting values', 'inkSecondary', 'surface'],
  ['supporting values on an off tile', 'inkSecondary', 'surfaceTile'],
  ['metadata on the page', 'inkMuted', 'bg'],
  ['metadata on a card', 'inkMuted', 'surface'],
  ['metadata on an off tile', 'inkMuted', 'surfaceTile'],
  ['metadata in a well', 'inkMuted', 'surfaceWell'],
  ['the dimmer percentage', 'inkMuted', 'surfaceControl'],
  ['a tertiary hint on a static tile', 'inkFaint', 'surfaceStatic'],
  ['a tertiary hint on a card', 'inkFaint', 'surface'],
  ['meta on a lit tile', 'litInk', 'litSurface'],
  ['a Fault on its chip', 'alert', 'alertSurface'],
  ['a Fault on a card', 'alert', 'surface'],
  ['an on status word on a card', 'accent', 'surface'],
  ['the switch knob on accent', 'onAccent', 'accent'],
  ['a primary button label', 'onPrimary', 'primary'],
];

for (const [what, fg, bg] of TEXT) {
  test(`text 4.5:1 -- ${what} (${fg} on ${bg})`, () => {
    const ratio = contrast(c[fg], c[bg]);
    assert.ok(ratio >= 4.5, `${ratio.toFixed(2)}:1`);
  });
}

const CONTROLS: [string, keyof typeof c, keyof typeof c][] = [
  ['an on icon on a lit tile', 'accent', 'litSurface'],
  ['an on switch track on a lit tile', 'accent', 'litSurface'],
  ['an on control on the page', 'accent', 'bg'],
  ['an off room icon', 'inkSecondary', 'surfaceTile'],
  ['a static room icon', 'inkMuted', 'surfaceStatic'],
  ['a Fault icon on its chip', 'alert', 'alertSurface'],
  ['the off switch knob on its track', 'knobOff', 'switchOff'],
  ['a primary fill on a card', 'primary', 'surface'],
  ['the focus ring on the page', 'focus', 'bg'],
];

for (const [what, fg, bg] of CONTROLS) {
  test(`controls and icons 3:1 -- ${what} (${fg} on ${bg})`, () => {
    const ratio = contrast(c[fg], c[bg]);
    assert.ok(ratio >= 3, `${ratio.toFixed(2)}:1`);
  });
}

test('labels stay 4.5:1 under the translucent dimmer and hold fills', () => {
  // accent-soft is translucent: what the eye sees is it laid over what is under it.
  const dimmer = contrast(c.ink, flatten(c.accentSoft, c.surfaceControl));
  assert.ok(dimmer >= 4.5, `ink over the dimmer fill: ${dimmer.toFixed(2)}:1`);
  const hold = contrast(c.onPrimary, flatten(c.accentSoft, c.primary));
  assert.ok(hold >= 4.5, `on-primary over the hold fill: ${hold.toFixed(2)}:1`);
});

test('the references in tokens.json are resolved, not carried as text', () => {
  assert.equal(c.primary, c.ink);
  assert.equal(c.focus, c.accent);
});

test('the CSS custom properties carry the design system names and values', () => {
  const css = cssVariables();
  assert.match(css, /--bg: #0e0f0d;/);
  assert.match(css, /--surface-tile: #191a18;/);
  assert.match(css, /--on-accent: #15130d;/);
  assert.match(css, /--primary: #f2f1ec;/);
  assert.match(css, /--font-sans: Geist, /);
  assert.match(css, /--space-3: 12px;/);
  assert.match(css, /--radius-tile: 24px;/);
  assert.match(css, /--target-min: 52px;/);
  assert.doesNotMatch(css, /[{}]/);
});

test("the legacy names read Casa Panel's values", () => {
  const t = buildTokens();
  assert.equal(t.color.ground, c.bg);
  assert.equal(t.color.textPrimary, c.ink);
  assert.equal(t.color.fault, c.alert);
  assert.equal(t.color.activeStrong, c.accent);
  assert.equal(t.font.family, CASA.font.sans);
  assert.equal(t.radius.tile, 24);
});

test('only sizes change on a phone, never colour', () => {
  assert.deepEqual(buildTokens('arm').color, buildTokens('wall').color);
});
