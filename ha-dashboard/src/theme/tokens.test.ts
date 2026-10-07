/**
 * ADR-0013 keeps ADR-0001's contrast findings as checks against Casa Panel's
 * values: text 4.5:1 on its ground, 3:1 for filled controls and icons. Each
 * pair below is one the design system documents or the panel renders, and
 * each is checked in both of Casa Panel's colour sets, dark and light (#63).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contrast, flatten } from './color';
import { CASA, buildTokens, casaVariables, cssVariables, type ColorName } from './tokens';

const SCHEMES = ['dark', 'light'] as const;
const c = CASA.color.dark;

const TEXT: [string, ColorName, ColorName][] = [
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

for (const scheme of SCHEMES) {
  const c = CASA.color[scheme];
  for (const [what, fg, bg] of TEXT) {
    test(`${scheme}: text 4.5:1 -- ${what} (${fg} on ${bg})`, () => {
      const ratio = contrast(c[fg], c[bg]);
      assert.ok(ratio >= 4.5, `${ratio.toFixed(2)}:1`);
    });
  }
}

const CONTROLS: [string, ColorName, ColorName][] = [
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

for (const scheme of SCHEMES) {
  const c = CASA.color[scheme];
  for (const [what, fg, bg] of CONTROLS) {
    test(`${scheme}: controls and icons 3:1 -- ${what} (${fg} on ${bg})`, () => {
      const ratio = contrast(c[fg], c[bg]);
      assert.ok(ratio >= 3, `${ratio.toFixed(2)}:1`);
    });
  }

  // accent-soft is translucent: what the eye sees is it laid over what is under it.
  test(`${scheme}: the dimmer's label stays 4.5:1 over its translucent fill`, () => {
    const dimmer = contrast(c.ink, flatten(c.accentSoft, c.surfaceControl));
    assert.ok(dimmer >= 4.5, `ink over the dimmer fill: ${dimmer.toFixed(2)}:1`);
  });

  // The hold sweep over Apri (`AccessRow`). In light it measures 4.27:1: the
  // design system documents no ratio for this pair, and its values are not
  // tuned here, so the gap is kept visible until the design system resolves
  // it (#63).
  const holdGap = scheme === 'light' && 'light on-primary over the hold fill is 4.27:1; the design system has to settle it';
  test(`${scheme}: Apri's label stays 4.5:1 under the hold sweep`, { todo: holdGap || undefined }, () => {
    const hold = contrast(c.onPrimary, flatten(c.accentSoft, c.primary));
    assert.ok(hold >= 4.5, `on-primary over the hold fill: ${hold.toFixed(2)}:1`);
  });

  test(`${scheme}: the references in tokens.json are resolved within the set, not carried as text`, () => {
    assert.equal(c.primary, c.ink);
    assert.equal(c.focus, c.accent);
  });
}

test('the dark and light sets name exactly the same tokens', () => {
  assert.deepEqual(Object.keys(CASA.color.light).sort(), Object.keys(CASA.color.dark).sort());
  assert.deepEqual(Object.keys(casaVariables('light')).sort(), Object.keys(casaVariables('dark')).sort());
});

test("the light set is Casa Panel's light values", () => {
  const l = CASA.color.light;
  assert.equal(l.bg, '#efeee9');
  assert.equal(l.ink, '#1a1b18');
  assert.equal(l.primary, '#1a1b18');
  assert.equal(l.focus, '#9a6210');
  assert.equal(l.accentSoft, '#eaa93a99');
  assert.equal(l.onPrimary, '#faf9f6');
});

test('only colour differs between the sets: type, space, radius and size are shared', () => {
  const dark = casaVariables('dark');
  const light = casaVariables('light');
  const colours = new Set(Object.keys(CASA.color.dark).map(k => k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)));
  for (const [name, value] of Object.entries(dark)) {
    if (!colours.has(name)) assert.equal(light[name], value, name);
  }
  assert.equal(light['surface-tile'], '#ffffff');
});

test('the design system states the light ratios it was drawn to (#63)', () => {
  const l = CASA.color.light;
  const near = (got: number, want: number, what: string) =>
    assert.ok(Math.abs(got - want) < 0.15, `${what}: ${got.toFixed(2)}:1, stated ${want}:1`);
  near(contrast(l.ink, l.bg), 14.9, 'ink on bg');
  near(contrast(l.accent, l.surface), 4.8, 'accent on surface');
  near(contrast(l.alert, l.alertSurface), 5.7, 'alert on alert-surface');
  assert.ok(contrast(l.inkMuted, l.surfaceControl) >= 4.7, 'ink-muted on surface-control');
});

test('the CSS custom properties carry the design system names and values, dark at the page root', () => {
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

test("a phone's touch floor is Casa Panel's target-min (#45)", () => {
  // The wall's 44 predates Casa Panel; the phone's done criterion is 52.
  assert.equal(buildTokens('arm').touch.floor, CASA.size.targetMin);
  assert.ok(buildTokens('arm').touch.primary >= CASA.size.targetMin);
});
