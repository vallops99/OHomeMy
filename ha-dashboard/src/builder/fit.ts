/**
 * Whether a Widget fits its box at a screen size (#56), as the Builder's
 * preview measures it at the smallest and the largest size of a Dashboard's
 * supported range.
 *
 * **A Widget does not fit when any of its content is out of sight**: its box
 * (the renderer's `.ohm-widget`, which scrolls what does not fit rather than
 * letting it spill onto the next Widget) or any scrolling region inside it
 * holds more than it shows, by more than one CSS pixel either way. That is
 * exactly when someone at the wall would have to scroll inside the Widget to
 * see all of it. Text cut short with an ellipsis is a Widget's own choice of
 * how to shrink, and does not count: the box is not scrollable for it.
 *
 * The one pixel absorbs sub-pixel rounding, which a proportional grid makes
 * on every size that is not a whole multiple of its cells.
 *
 * Measured in layout pixels, so the preview's zoom (a CSS transform) never
 * changes the answer.
 */

/** What the DOM says about one scrolling element, or the box itself. */
export type Extent = { clientWidth: number; clientHeight: number; scrollWidth: number; scrollHeight: number };

export const FIT_TOLERANCE_PX = 1;

/** Whether this element holds more than it shows. */
export function overflows(e: Extent): boolean {
  return e.scrollWidth - e.clientWidth > FIT_TOLERANCE_PX || e.scrollHeight - e.clientHeight > FIT_TOLERANCE_PX;
}

/**
 * Whether a Widget fits: its box, and every scrolling region in it (the
 * caller passes only elements whose computed overflow is `auto` or
 * `scroll`), shows all it holds.
 */
export function fits(box: Extent, scrollers: readonly Extent[] = []): boolean {
  return !overflows(box) && !scrollers.some(overflows);
}
