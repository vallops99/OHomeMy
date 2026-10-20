/**
 * What a released slider shows until Home Assistant catches up (#71).
 *
 * A service call takes a round-trip, so for a moment after release the
 * incoming value is still the old reading: a bar that went back to it would
 * flash new -> old -> new. Released, the bar keeps its value as pending,
 * against the live value it was released over. The live value wins again
 * the moment it changes -- whatever it changes to, since Home Assistant
 * rounds a percentage through 0-255 and a Room Tile clamps an on light to
 * at least 1 -- or when it has not changed within `PENDING_MS`, because the
 * light was unavailable, the call was refused or the same value was sent.
 *
 * `Dimmer` and `Slider` share it through `usePendingValue`; neither this nor
 * the rule knows about React, and the clock is passed in.
 */

/** How long a released value waits for Home Assistant before the live value wins anyway. */
export const PENDING_MS = 5000;

/** A released value, the live value it was released over, and when. */
export type Pending = { value: number; from: number; at: number };

/** The value to show: the pending one while the live value has not moved and time remains, else the live one. */
export function pendingShown(pending: Pending | null, live: number, now: number): number {
  if (pending === null || pending.from !== live || now - pending.at >= PENDING_MS) return live;
  return pending.value;
}
