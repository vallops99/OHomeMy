/**
 * Themes as CSS custom properties (#50).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { THEMES, themeCss, themeFor } from './themes';

test('Casa Panel carries every token under its design-system name, type styles included', () => {
  const dark = THEMES['casa-panel'].dark;
  assert.equal(dark['bg'], '#0e0f0d');
  assert.equal(dark['lit-surface'], '#26221a');
  assert.equal(dark['radius-tile'], '24px');
  assert.equal(dark['space-3'], '12px');
  assert.equal(dark['type-clock-size'], '30px');
  assert.equal(dark['type-clock-line'], '36px');
  assert.equal(dark['type-temp-hero-line'], '1');
  assert.equal(dark['type-label-tracking'], '0.08em');
});

test("Casa Panel's light is the design system's light set, its dark the dark set (#63)", () => {
  const { light, dark } = THEMES['casa-panel'];
  assert.equal(light['bg'], '#efeee9');
  assert.equal(light['ink'], '#1a1b18');
  assert.equal(light['primary'], '#1a1b18');
  assert.equal(light['focus'], '#9a6210');
  assert.equal(dark['bg'], '#0e0f0d');
  assert.equal(dark['primary'], '#f2f1ec');
  assert.deepEqual(Object.keys(light).sort(), Object.keys(dark).sort());
  assert.equal(light['radius-tile'], dark['radius-tile']);
  assert.equal(light['type-clock-size'], dark['type-clock-size']);
});

test('an unknown theme name falls back to Casa Panel', () => {
  assert.equal(themeFor('no-such-theme'), THEMES['casa-panel']);
});

test('a fixed mode is one set, on the shadow host and on the page root', () => {
  const css = themeCss('casa-panel', 'dark');
  assert.match(css, /^:host \{ color-scheme: dark; --bg: #0e0f0d;/);
  assert.match(css, /\n:root \{ color-scheme: dark; --bg: #0e0f0d;/);
  assert.doesNotMatch(css, /@media/);
  assert.doesNotMatch(css, /:host, :root/);
  assert.doesNotMatch(css, /#efeee9/);
});

test('light mode emits the light set only', () => {
  const css = themeCss('casa-panel', 'light');
  assert.match(css, /^:host \{ color-scheme: light; --bg: #efeee9;/);
  assert.match(css, /\n:root \{ color-scheme: light; --bg: #efeee9;/);
  assert.match(css, /--ink: #1a1b18;/);
  assert.doesNotMatch(css, /#0e0f0d/);
  assert.doesNotMatch(css, /@media/);
});

test('auto is the light set, and the dark set when the device prefers dark', () => {
  const css = themeCss('casa-panel', 'auto');
  assert.match(css, /^:host \{ color-scheme: light;/);
  assert.match(css, /@media \(prefers-color-scheme: dark\) \{\n:host \{ color-scheme: dark;/);
  const [light, dark] = css.split('@media');
  assert.match(light, /--bg: #efeee9;/);
  assert.doesNotMatch(light, /#0e0f0d/);
  assert.match(dark, /--bg: #0e0f0d;/);
  assert.doesNotMatch(dark, /#efeee9/);
});
