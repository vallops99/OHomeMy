/**
 * The old Row's shape, which `ToggleTile` and the read-only rows keep after
 * the Row itself became a Room Tile (#42): the row surface with its state
 * marker, and the slider's optimistic drag. Two components rendering the
 * same shape must not drift apart one copied line at a time.
 */
import { useState, type CSSProperties } from 'react';
import { v } from './vars';

/**
 * The row's box in its Region: its share of the height, and its corners.
 *
 * Share the Region with the other rows rather than taking a fixed height:
 * five Areas fill the panel, six share it, and the floor below keeps a row
 * readable at 2 m either way. A bare row (`ToggleTile`) is this box itself; a
 * Row is wrapped by its swipe surface, which takes the box instead, and the
 * card inside fills it.
 */
export const rowBox = {
  flex: 1,
  minHeight: v.layout.rowRoom,
  borderRadius: v.radius.tile,
} satisfies CSSProperties;

/** The row's surface and state marker, for a `Tile` laid out as a `row`. */
export function rowStyle({ active, unavailable }: { active: boolean; unavailable: boolean }): CSSProperties {
  return {
    ...rowBox,
    gap: v.space.md,
    // `Tile` already applies its own horizontal padding via `cssStyles`
    // (v.space.md), so no second padding is added here.
    background: unavailable ? v.color.alertSurface : v.color.surface,
    // The state marker is painted INSIDE the row, not as a left border.
    //
    // A 6 px `borderLeft` replaces `Tile`'s own 1 px border on that edge,
    // so an inactive row -- whose marker is transparent -- lost the left
    // side of its outline against the rounded corner, and the card read
    // as broken. As a gradient the marker sits within the padding box and
    // all four sides keep the same 1 px border.
    backgroundImage: `linear-gradient(to right, ${unavailable ? v.color.alert : active ? v.color.accent : 'transparent'} 0 6px, transparent 6px)`,
  };
}

/**
 * The value a row's slider shows, and a `ToggleTile`'s long-press disarm.
 *
 * The optimistic drag state lives in `Slider`, which owns the gesture and
 * the commit. This only mirrors what the slider reports so the row's own
 * notion of "current brightness" tracks the finger; the `from === live`
 * guard falls it back to the live value the instant a drag ends, rather
 * than staying pinned to a stale optimistic number (RoomTile, #7).
 *
 * Adjusting the slider must not also open the row's long-press modal over
 * the control being used -- see the note in `Slider`. `sliding` is what a
 * `ToggleTile` passes as `disableModal` for as long as a gesture is in
 * progress. A Row has no modal to disarm (ADR-0010) and ignores it.
 */
export function useRowSlider(live: number) {
  const [dragged, setDragged] = useState<{ value: number; from: number } | null>(null);
  const [sliding, setSliding] = useState(false);
  return {
    shown: dragged && dragged.from === live ? dragged.value : live,
    sliding,
    setSliding,
    /** Record where the finger is, against the live value it started from. */
    track: (value: number) => setDragged({ value, from: live }),
  };
}
