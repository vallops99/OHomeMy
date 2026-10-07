/**
 * Themes as CSS custom properties (#50).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COLOR_TOKENS, FADE_MS, registerThemeColors, THEME_FADE_CSS, THEMES, themeCss, themeFor } from './themes';

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

test('no scheme is left to the device: one set, chosen before the stylesheet is written (#70)', () => {
  for (const scheme of ['light', 'dark'] as const) assert.doesNotMatch(themeCss('casa-panel', scheme), /@media|prefers-color-scheme/);
});

test('the theme itself transitions nothing, so the first render shows its scheme at once', () => {
  assert.doesNotMatch(themeCss('casa-panel', 'dark'), /transition/);
});

test('the fade transitions every colour token, and only colour, over 300 ms, on the host and the root', () => {
  const [host, root] = THEME_FADE_CSS.split('\n');
  assert.match(host, /^:host \{ transition: /);
  assert.equal(root, host.replace(':host', ':root'));
  const transition = /transition: ([^;]+);/.exec(host)?.[1] ?? '';
  const faded = transition.split(', ').map(t => t.split(' ')[0]);
  assert.deepEqual(faded.sort(), COLOR_TOKENS.map(t => `--${t}`).sort());
  assert.match(transition, /^--[a-z-]+ 300ms ease/);
  assert.ok(COLOR_TOKENS.includes('bg') && COLOR_TOKENS.includes('accent-soft'));
  assert.ok(!COLOR_TOKENS.includes('radius-tile') && !COLOR_TOKENS.includes('font-sans'));
  assert.equal(FADE_MS, 300);
});

test('the colour tokens are registered as colours, so a transition can interpolate them', () => {
  const registered: PropertyDefinition[] = [];
  registerThemeColors({ registerProperty: d => void registered.push(d) });
  assert.deepEqual(
    registered.map(d => d.name),
    COLOR_TOKENS.map(t => `--${t}`)
  );
  for (const d of registered) {
    assert.equal(d.syntax, '<color>');
    assert.equal(d.inherits, true);
    assert.equal(d.initialValue, THEMES['casa-panel'].dark[d.name.slice(2)]);
  }
});

test('registering again (a hot reload), or where the browser cannot, is harmless', () => {
  registerThemeColors({
    registerProperty: () => {
      throw new DOMException('already registered', 'InvalidModificationError');
    },
  });
  registerThemeColors(undefined);
});
