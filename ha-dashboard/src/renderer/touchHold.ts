/**
 * No switch of light and dark while someone touches the Dashboard (#70,
 * ADR-0015 "Language and themes").
 *
 * A switch is wanted whenever the scheme the Dashboard should show changes.
 * With nothing down it applies at once. With anything down (a tap, a press,
 * a drag, a swipe) it waits, and applies the moment the last one lifts: no
 * grace period, and no waiting for the idle spell. Only the latest wish
 * counts, so a wish back to what is shown cancels the switch.
 *
 * Two things can be down, and `useSchemeShown` feeds both:
 *
 * - Fingers, counted from touch events: `touches` is the number still on
 *   the screen (`TouchEvent.touches`) after a touch starts on the Dashboard
 *   or ends anywhere. Not from pointer events: a browser cancels a touch's
 *   pointer (`pointercancel`) as soon as the finger starts a scroll or a
 *   swipe, while the finger is still down.
 * - A mouse or a pen, by `pointerId`: `down` when it goes down on the
 *   Dashboard; `up` on `pointerup` or `pointercancel` anywhere in the
 *   window, or a lost pointer capture with no button pressed.
 *
 * The window losing focus or the page being hidden is `release-all`, since
 * a lift it cannot see would otherwise hold the switch forever.
 */
import type { ColorScheme } from '../theme/tokens';

export type Hold = {
  /** The mice and pens down on the Dashboard now, by `pointerId`. */
  down: ReadonlySet<number>;
  /** The fingers on the screen now. */
  touches: number;
  /** The scheme on screen. */
  shown: ColorScheme;
  /** The scheme waiting for the last pointer to lift; `null` when none is. */
  pending: ColorScheme | null;
};

export type HoldEvent =
  | { type: 'down'; id: number }
  | { type: 'up'; id: number }
  | { type: 'touches'; count: number }
  | { type: 'release-all' }
  | { type: 'want'; scheme: ColorScheme };

export const holding = (shown: ColorScheme): Hold => ({ down: new Set(), touches: 0, shown, pending: null });

const held = (state: Hold) => state.down.size > 0 || state.touches > 0;

/** The next state; the same object when nothing changed, so nothing redraws. */
export function touchHold(state: Hold, event: HoldEvent): Hold {
  switch (event.type) {
    case 'want': {
      if (!held(state))
        return event.scheme === state.shown && state.pending === null ? state : { ...state, shown: event.scheme, pending: null };
      const pending = event.scheme === state.shown ? null : event.scheme;
      return pending === state.pending ? state : { ...state, pending };
    }
    case 'down':
      return state.down.has(event.id) ? state : { ...state, down: new Set(state.down).add(event.id) };
    case 'up': {
      if (!state.down.has(event.id)) return state;
      const down = new Set(state.down);
      down.delete(event.id);
      return settle({ ...state, down });
    }
    case 'touches':
      return event.count === state.touches ? state : settle({ ...state, touches: Math.max(0, event.count) });
    case 'release-all':
      return held(state) ? settle({ ...state, down: new Set(), touches: 0 }) : state;
  }
}

/** Once nothing is down, a waiting switch applies. */
const settle = (state: Hold): Hold => (held(state) || state.pending === null ? state : { ...state, shown: state.pending, pending: null });
