/**
 * Document-level selectors, re-aimed at the shadow root's host.
 *
 * A Dashboard renders inside its own shadow root (ADR-0015, "Running inside a
 * panel"), and there `:root`, `html` and `body` match nothing. Yet that is
 * where @hakit's ThemeProvider puts its ~700 custom properties, and where
 * `HakitTheme` puts Casa Panel's tokens and the page shell. Rewriting them to
 * `:host` lands them on the panel element, from where they inherit into
 * everything the Dashboard renders -- and stops them landing on Home
 * Assistant's own page, which is where they went before.
 */
import type { StylisPlugin } from '@emotion/cache';

/**
 * `:root`, `html` or `body` as the whole of a selector's first compound,
 * followed by nothing or a combinator. Anything more specific (`html.dark`,
 * `:root[dir]`) is left alone: it has no faithful `:host` spelling, and
 * nothing we render writes one.
 */
const DOCUMENT_ROOT = /^(?::root|html|body)(?=$|\s|[>+~])/;

export function toHostSelector(selector: string): string {
  return selector.replace(DOCUMENT_ROOT, ':host');
}

/** The emotion (stylis) plugin that applies `toHostSelector` to every rule. */
export const hostSelectors: StylisPlugin = element => {
  if (element.type === 'rule' && Array.isArray(element.props)) {
    element.props = element.props.map(toHostSelector);
  }
};
