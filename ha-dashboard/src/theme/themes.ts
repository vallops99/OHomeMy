/**
 * Themes (ADR-0015, CONTEXT.md "Theme"): a named set of token values in light
 * and dark, applied as CSS custom properties. A Dashboard's settings name its
 * theme and its mode, light, dark or `auto` to follow the device.
 *
 * The renderer puts `themeCss(...)` in a `<style>` inside the Dashboard's
 * shadow root, so the properties land on the panel element (`:host`) and
 * every Widget, and every portal in the same root, inherits them. Widgets
 * read colour, radius and type only through these properties
 * (`var(--accent)`, or `v.color.accent` from `ui/vars.ts` in an inline
 * style), never as values, which is what lets a theme or a mode change
 * restyle them; `widgets/look.test.ts` holds every module a Widget reaches to
 * it (#62). What sizes a Widget is its box, not the theme (`ui/vars.ts`).
 *
 * A theme is added by adding an entry to `THEMES`; its token names must be
 * Casa Panel's, since those are the names every Widget reads.
 */
import { casaVariables } from './tokens';

/** Custom property name (without `--`) to value. */
export type ThemeTokens = Readonly<Record<string, string>>;

export type Theme = { light: ThemeTokens; dark: ThemeTokens };

export type ThemeMode = 'light' | 'dark' | 'auto';

export const THEMES: Readonly<Record<string, Theme>> = {
  /**
   * Casa Panel (ADR-0013) draws both: dark, its default, for a wall that must
   * not light up a room at night, and light for daytime (#63). The two share
   * every token name and every non-colour value.
   */
  'casa-panel': { light: casaVariables('light'), dark: casaVariables('dark') },
};

/** The theme a Dashboard gets when the one it names is not in `THEMES`. */
export const DEFAULT_THEME = 'casa-panel';

export function themeFor(name: string): Theme {
  return THEMES[name] ?? THEMES[DEFAULT_THEME];
}

/**
 * The stylesheet that applies a theme in a mode. It targets `:host`, which is
 * the panel element when this sits in its shadow root, and `:root`, which is
 * the page when the dev server renders the Dashboard without one. Each
 * selector is its own rule: a list containing a selector the context cannot
 * use would be dropped whole.
 */
export function themeCss(name: string, mode: ThemeMode): string {
  const theme = themeFor(name);
  const block = (tokens: ThemeTokens, scheme: 'light' | 'dark') => {
    const body = [`color-scheme: ${scheme};`, ...Object.entries(tokens).map(([k, v]) => `--${k}: ${v};`)].join(' ');
    return `:host { ${body} }\n:root { ${body} }`;
  };
  if (mode !== 'auto') return block(theme[mode], mode);
  return `${block(theme.light, 'light')}\n@media (prefers-color-scheme: dark) {\n${block(theme.dark, 'dark')}\n}`;
}
