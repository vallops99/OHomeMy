/**
 * The Row swipe's decision, kept apart from the gesture binding (#27).
 *
 * `RoomRow` binds @use-gesture's `useDrag` and feeds it through here: how far
 * the Row follows the finger, and whether letting go opens the Area's Page or
 * springs back. Every number is justified, with sources, in
 * docs/research/row-swipe-gesture.md; this file only states them.
 */

/**
 * px before a touch starts to count as a drag, and the tolerance within which
 * it is still a tap. Just over Android's 8 dp touch slop, so the Row does not
 * start moving before the browser has had its chance to claim a vertical
 * scroll. One CSS px is one dp on the tablet's WebView.
 */
export const SWIPE_ACTIVATION = 10;

/** Fraction of the Row's width a slow drag must pass to open the Page. */
const SWIPE_COMMIT_FRACTION = 1 / 3;

/**
 * A flick: px/ms at release, and the least distance it must have covered.
 * @use-gesture's own swipe defaults, read at release rather than through its
 * `swipe` option, whose 250 ms total-duration cap rejects drag-then-flick.
 */
const FLICK_VELOCITY = 0.5;
const FLICK_DISTANCE = 50;

/** How far the Row sits from rest while following the finger: rightward only. */
export function swipeOffset(movementX: number): number {
  return Math.max(0, movementX);
}

export type SwipeRelease = {
  /** The Row's offset at release, from `swipeOffset`. */
  offset: number;
  /** The Row's width, px. */
  width: number;
  /** Absolute x-velocity at release, px/ms (@use-gesture's `velocity[0]`). */
  velocity: number;
  /** Sign of the x-movement at release (@use-gesture's `direction[0]`). */
  direction: number;
  /**
   * The gesture was taken away rather than let go: cancelled, or ended by a
   * `pointercancel` because the browser claimed it as a vertical scroll.
   */
  aborted: boolean;
};

/** Whether letting go opens the Page. Anything else springs back. */
export function swipeCommits({ offset, width, velocity, direction, aborted }: SwipeRelease): boolean {
  if (aborted) return false;
  const far = width > 0 && offset >= width * SWIPE_COMMIT_FRACTION;
  const flick = direction > 0 && velocity >= FLICK_VELOCITY && offset >= FLICK_DISTANCE;
  return far || flick;
}
