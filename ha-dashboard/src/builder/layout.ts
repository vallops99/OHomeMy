/**
 * Laying Widgets out on a Page's grid in the Builder (#56): where a pointer
 * is on the grid, how a drag snaps to cells, and what a move, a resize, an
 * add or a delete does to a Dashboard.
 *
 * ## The overlap rule
 *
 * **No two Widgets of a Page share a cell, and every Widget lies on the
 * grid.** A drag shows where the Widget would land, snapped to whole cells
 * and kept inside the grid; if that place overlaps another Widget it is
 * shown as refused, and dropping there leaves the Widget where it was.
 * Nothing is ever pushed aside to make room: a drag moves one Widget and
 * nothing else, so what the admin sees under the pointer is the whole edit.
 * The document allows overlap (later Widgets draw on top), but a wall
 * Dashboard has no use for a Widget hidden under another, and a hidden one
 * could still be a Fault on the Verdict.
 *
 * "On the grid" is `fitsGrid`'s rule, which the server checks too: inside
 * the columns always, and inside the rows when the Dashboard fits; a
 * scrolling Page grows rows below the last.
 *
 * Every function takes a value and returns a new one, never changing its
 * argument, and refuses an edit by returning its argument as it was. No
 * React and no DOM: `layout.test.ts` runs this under plain Node, and the
 * preview hands it the grid's measured geometry as numbers.
 */
import { fitsGrid, type GridContext } from '../document/schema';
import type { Dashboard, Page, Widget } from '../document/types';

/** A Widget's place: its top-left cell and the cells it spans. */
export type Box = Pick<Widget, 'x' | 'y' | 'w' | 'h'>;

/** A Page's grid and how its Dashboard overflows, as `fitsGrid` takes it. */
export type Grid = GridContext;

export const gridOf = (page: Page, overflow: Grid['overflow']): Grid => ({ ...page.grid, overflow });

/**
 * The grid as it is drawn, in screen pixels: its top-left corner, one
 * column's width, one row's height, and the gap between cells. The preview
 * measures it off the element (scaled, if the preview is); a cell's pitch is
 * its size plus one gap.
 */
export type Metrics = { left: number; top: number; column: number; row: number; gap: number };

/**
 * The cell under a point, clamped to the grid: a pointer left of the first
 * column is in it, one past the last is in the last. Rows are clamped below
 * only when the Dashboard fits; a scrolling Page has rows below its last.
 * A point in a gap belongs to the cell before it.
 */
export function cellAt(metrics: Metrics, point: { x: number; y: number }, grid: Grid): { x: number; y: number } {
  const x = Math.floor((point.x - metrics.left + metrics.gap / 2) / (metrics.column + metrics.gap));
  const y = Math.floor((point.y - metrics.top + metrics.gap / 2) / (metrics.row + metrics.gap));
  return { x: clamp(x, 0, grid.columns - 1), y: grid.overflow === 'fit' ? clamp(y, 0, grid.rows - 1) : Math.max(0, y) };
}

/** A drag of so many pixels, as whole cells: it snaps to the nearest. */
export function snapDelta(metrics: Metrics, dx: number, dy: number): { dx: number; dy: number } {
  return { dx: Math.round(dx / (metrics.column + metrics.gap)) || 0, dy: Math.round(dy / (metrics.row + metrics.gap)) || 0 };
}

/** `box` moved by whole cells, then pushed back onto the grid if it went off. */
export function moved(box: Box, delta: { dx: number; dy: number }, grid: Grid): Box {
  return placedOnGrid({ ...box, x: box.x + delta.dx, y: box.y + delta.dy }, grid);
}

/**
 * `box` resized from its bottom-right corner by whole cells: at least one
 * cell each way, and never past the grid's right edge (nor its last row,
 * when the Dashboard fits).
 */
export function resized(box: Box, delta: { dx: number; dy: number }, grid: Grid): Box {
  const w = clamp(box.w + delta.dx, 1, grid.columns - box.x);
  const h = grid.overflow === 'fit' ? clamp(box.h + delta.dy, 1, grid.rows - box.y) : Math.max(1, box.h + delta.dy);
  return { ...box, w, h };
}

/**
 * `box` with its size cut to the grid and its corner moved so all of it is
 * on the grid. A Widget too big for a smaller grid shrinks rather than
 * failing.
 */
export function placedOnGrid(box: Box, grid: Grid): Box {
  const w = clamp(box.w, 1, grid.columns);
  const h = grid.overflow === 'fit' ? clamp(box.h, 1, grid.rows) : Math.max(1, box.h);
  const x = clamp(box.x, 0, grid.columns - w);
  const y = grid.overflow === 'fit' ? clamp(box.y, 0, grid.rows - h) : Math.max(0, box.y);
  return { x, y, w, h };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Whether `box` may hold a Widget on this Page: on the grid and sharing no
 * cell with any other Widget. `except` is the Widget being moved, which
 * never collides with where it already is.
 */
export function canPlace(box: Box, widgets: readonly Widget[], grid: Grid, except?: string): boolean {
  return fitsGrid(box, grid) && !widgets.some(w => w.id !== except && overlaps(box, w));
}

/**
 * The first place, reading row by row from the top-left, where a Widget of
 * `size` fits without overlapping any other; on a full Page, a smaller one
 * down to a single cell. `null` when not even one cell is free. A scrolling
 * Page always has room below its lowest Widget.
 */
export function freeSpot(widgets: readonly Widget[], grid: Grid, size: { w: number; h: number }): Box | null {
  const lowest = widgets.reduce((bottom, w) => Math.max(bottom, w.y + w.h), 0);
  const rows = grid.overflow === 'fit' ? grid.rows : Math.max(grid.rows, lowest + size.h);
  for (const [w, h] of shrinking(Math.min(size.w, grid.columns), grid.overflow === 'fit' ? Math.min(size.h, grid.rows) : size.h)) {
    for (let y = 0; y + h <= rows; y++) {
      for (let x = 0; x + w <= grid.columns; x++) {
        if (canPlace({ x, y, w, h }, widgets, { ...grid, rows }, undefined)) return { x, y, w, h };
      }
    }
  }
  return null;
}

/** The sizes to try, the asked-for one first, halving towards one cell. */
function shrinking(w: number, h: number): [number, number][] {
  const sizes: [number, number][] = [];
  for (;;) {
    sizes.push([w, h]);
    if (w === 1 && h === 1) return sizes;
    w = Math.max(1, Math.ceil(w / 2));
    h = Math.max(1, Math.ceil(h / 2));
  }
}

/**
 * The smallest grid a Page's Widgets allow: as many columns as the right-
 * most one reaches, and as many rows as the lowest one reaches. Shrinking
 * below it would cut a Widget off; the server refuses that when the
 * Dashboard fits.
 */
export function minimumGrid(page: Page): { columns: number; rows: number } {
  return page.widgets.reduce((m, w) => ({ columns: Math.max(m.columns, w.x + w.w), rows: Math.max(m.rows, w.y + w.h) }), {
    columns: 1,
    rows: 1,
  });
}

// --- Edits to a Dashboard's Widgets -----------------------------------------

/** The Dashboard with one of its Pages changed. */
export function mapPage(dashboard: Dashboard, pageId: string, f: (page: Page) => Page): Dashboard {
  return { ...dashboard, pages: dashboard.pages.map(p => (p.id === pageId ? f(p) : p)) };
}

const pageOf = (dashboard: Dashboard, pageId: string) => dashboard.pages.find(p => p.id === pageId);

/**
 * `widget` added on top of the Page, if its box may hold it. Its id must be
 * new to the Dashboard (Widget ids are unique across all its Pages).
 */
export function addWidget(dashboard: Dashboard, pageId: string, widget: Widget): Dashboard {
  const page = pageOf(dashboard, pageId);
  if (!page || !canPlace(widget, page.widgets, gridOf(page, dashboard.settings.overflow))) return dashboard;
  return mapPage(dashboard, pageId, p => ({ ...p, widgets: [...p.widgets, widget] }));
}

/** The Widget at `box`, by a move or a resize; refused if `box` may not hold it. */
export function placeWidget(dashboard: Dashboard, pageId: string, widgetId: string, box: Box): Dashboard {
  const page = pageOf(dashboard, pageId);
  const widget = page?.widgets.find(w => w.id === widgetId);
  if (!page || !widget) return dashboard;
  if (box.x === widget.x && box.y === widget.y && box.w === widget.w && box.h === widget.h) return dashboard;
  if (!canPlace(box, page.widgets, gridOf(page, dashboard.settings.overflow), widgetId)) return dashboard;
  return updateWidget(dashboard, pageId, widgetId, { x: box.x, y: box.y, w: box.w, h: box.h });
}

/** The Widget with some of its fields replaced: its Variant, title, on tap, settings. */
export function updateWidget(dashboard: Dashboard, pageId: string, widgetId: string, patch: Partial<Omit<Widget, 'id'>>): Dashboard {
  return mapPage(dashboard, pageId, p => ({ ...p, widgets: p.widgets.map(w => (w.id === widgetId ? { ...w, ...patch } : w)) }));
}

export function deleteWidget(dashboard: Dashboard, pageId: string, widgetId: string): Dashboard {
  return mapPage(dashboard, pageId, p => ({ ...p, widgets: p.widgets.filter(w => w.id !== widgetId) }));
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max));
