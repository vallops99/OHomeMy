/**
 * The proportional grid (ADR-0015, "Inside a Dashboard"): a Page's `columns`
 * share its width and its `rows` share one screen's height, so a Widget's box
 * grows and shrinks with the screen across the supported range, and nothing
 * is zoomed.
 *
 * The arithmetic is CSS's, so it follows a resize or a rotation with no
 * measuring: the Page is a size container, and a row is one share of its
 * height (`100cqh`) after the gaps. `fit` holds exactly `rows` of them and
 * never scrolls; `scroll` adds rows of the same height below the last for
 * any Widget placed there, and the Page scrolls.
 *
 * No React, so `grid.test.ts` runs it under plain Node.
 */
import type { DashboardSettings, Page, Widget } from '../document/types';
import { SCRIPT_CSS } from '../i18n/scriptCss';

/** The custom properties that size one Page's grid; `RENDERER_CSS` reads them. */
export function gridVariables(grid: Page['grid']): Record<string, string> {
  return { '--ohm-columns': String(grid.columns), '--ohm-rows': String(grid.rows) };
}

/** A Widget's cell span: CSS grid lines count from 1, the document from 0. */
export function cellPlacement(widget: Pick<Widget, 'x' | 'y' | 'w' | 'h'>): { gridColumn: string; gridRow: string } {
  return { gridColumn: `${widget.x + 1} / span ${widget.w}`, gridRow: `${widget.y + 1} / span ${widget.h}` };
}

export type Overflow = DashboardSettings['overflow'];

/**
 * The renderer's own stylesheet, put once in the shadow root beside the
 * theme's. Classes start with `ohm-`.
 *
 * - `.ohm-dashboard` fills the panel and is a size container, so the Page's
 *   padding can follow the screen: Casa Panel's 24/28 px at the wall,
 *   shrinking to 12 on a phone.
 * - `.ohm-page` is the scroller, or not, and the size container rows are
 *   measured against.
 * - `.ohm-cell` is a Widget's place on the grid. It holds the Widget's box
 *   and, when the Widget opens a Page beside a tap of its own, the Open
 *   button (`tap.ts`), so the box a kind adapts to is the box it has.
 * - `.ohm-widget` is each Widget's box. It is a size container named
 *   `widget`, which is what a kind's container queries ask about, and it
 *   scrolls its own content when that does not fit, so a Page that fits
 *   never does. `data-opens` marks one whose whole box opens a Page.
 *
 * Right to left (#59, ADR-0015) the grid stays where the admin placed it:
 * column 1 is on the left for every viewer, so `.ohm-grid` is laid out left
 * to right whatever the language, and only inside each cell does an Arabic
 * viewer's text run right to left.
 */
export const RENDERER_CSS = `
  .ohm-dashboard {
    height: 100%;
    box-sizing: border-box;
    container: ohm-dashboard / size;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }
  .ohm-page {
    height: 100%;
    box-sizing: border-box;
    container: ohm-page / size;
    padding: clamp(var(--space-3), 3cqh, var(--space-6)) clamp(var(--space-3), 2.2cqw, var(--space-7));
    overscroll-behavior: none;
  }
  .ohm-page[data-overflow='fit'] { overflow: hidden; }
  .ohm-page[data-overflow='scroll'] { overflow: hidden auto; }
  .ohm-grid {
    --ohm-row: max(1px, calc((100cqh - (var(--ohm-rows) - 1) * var(--space-3)) / var(--ohm-rows)));
    display: grid;
    gap: var(--space-3);
    grid-template-columns: repeat(var(--ohm-columns), minmax(0, 1fr));
    grid-template-rows: repeat(var(--ohm-rows), var(--ohm-row));
    grid-auto-rows: var(--ohm-row);
    direction: ltr;
  }
  .ohm-cell:dir(rtl) { direction: rtl; }
  ${SCRIPT_CSS}
  .ohm-cell {
    min-width: 0;
    min-height: 0;
    display: flex;
    gap: var(--space-2);
  }
  .ohm-widget {
    flex: 1;
    container: widget / size;
    min-width: 0;
    min-height: 0;
    display: flex;
    overflow: auto;
    overscroll-behavior: contain;
  }
  .ohm-widget > * { flex: 1; min-width: 0; }
  .ohm-widget[data-opens] { cursor: pointer; transition: transform .12s ease; }
  .ohm-widget[data-opens]:active { transform: scale(.96); }
  .ohm-widget[data-opens]:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; border-radius: var(--radius-tile); }
  .ohm-open {
    flex: none;
    width: var(--target-min);
    padding: 0;
    box-sizing: border-box;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-tile);
    background: transparent;
    color: var(--ink-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    touch-action: manipulation;
    transition: transform .12s ease;
  }
  .ohm-open:active { transform: scale(.96); }
  .ohm-open:focus-visible { outline: 2px solid var(--focus); outline-offset: 3px; }
  .ohm-notice {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-6);
    box-sizing: border-box;
    text-align: center;
    color: var(--ink-muted);
  }
  .ohm-notice-title { font-size: var(--type-row-title-size); line-height: var(--type-row-title-line); font-weight: 500; color: var(--ink-soft); }
  .ohm-notice-detail { font-size: var(--type-body-size); line-height: var(--type-body-line); max-width: 36em; }
`;
