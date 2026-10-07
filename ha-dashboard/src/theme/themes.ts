/**
 * Themes (ADR-0015, CONTEXT.md "Theme"): a named set of token values in light
 * and dark, applied as CSS custom properties. A Dashboard's settings name its
 * theme and its Mode; which of the two sets the Mode shows right now is
 * decided at runtime (`schemeShown.ts`, #70) and only then written here.
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
import { CASA, casaVariables, kebab, type ColorScheme } from './tokens';

/** Custom property name (without `--`) to value. */
export type ThemeTokens = Readonly<Record<string, string>>;

export type Theme = { light: ThemeTokens; dark: ThemeTokens };

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

/** Every Theme's colour tokens: the ones that differ between light and dark. */
export const COLOR_TOKENS: readonly string[] = Object.keys(CASA.color.dark).map(kebab);

/** How long a switch of light and dark fades (Casa Panel's README, "Themes"). */
export const FADE_MS = 300;

/**
 * The stylesheet that applies a theme in one scheme. It targets `:host`,
 * which is the panel element when this sits in its shadow root, and `:root`,
 * which is the page when the dev server renders the Dashboard without one.
 * Each selector is its own rule: a list containing a selector the context
 * cannot use would be dropped whole.
 */
export function themeCss(name: string, scheme: ColorScheme): string {
  const tokens = themeFor(name)[scheme];
  const body = [`color-scheme: ${scheme};`, ...Object.entries(tokens).map(([k, v]) => `--${k}: ${v};`)].join(' ');
  return `:host { ${body} }\n:root { ${body} }`;
}

/**
 * The fade: every colour token transitions to its new value over `FADE_MS`,
 * on the same elements `themeCss` sets them on. It interpolates only once
 * `registerThemeColors` has run; a browser that cannot register properties
 * switches at once. The renderer adds it after its first render, so that
 * render does not fade in from whatever the element held before.
 */
export const THEME_FADE_CSS = (() => {
  const body = `transition: ${COLOR_TOKENS.map(t => `--${t} ${FADE_MS}ms ease`).join(', ')};`;
  return `:host { ${body} }\n:root { ${body} }`;
})();

/**
 * Registers each colour token as a `<color>` (an `@property` from script,
 * since an `@property` rule in a shadow root is ignored). An unregistered
 * custom property is a string, which a transition can only swap at its
 * midpoint; a registered colour interpolates, and every element that reads
 * it through `var()` (a background, a border, a fill, a shadow) fades with
 * it, with no rule of its own. Registration is for the whole page, which is
 * harmless: the names are Casa Panel's, and every value set for them is a
 * colour.
 *
 * Registering a name twice throws (a hot reload does it); the first stands.
 */
export function registerThemeColors(css: { registerProperty(definition: PropertyDefinition): void } | undefined): void {
  if (!css?.registerProperty) return;
  const fallback = themeFor(DEFAULT_THEME).dark;
  for (const token of COLOR_TOKENS) {
    try {
      css.registerProperty({ name: `--${token}`, syntax: '<color>', inherits: true, initialValue: fallback[token] });
    } catch {
      // Already registered.
    }
  }
}
