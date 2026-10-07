/**
 * A gate's hold-to-open, kept apart from the pointer binding (#43).
 *
 * Opening a gate is physical and hard to undo, so Apri acts only after a
 * press held for 700 ms; Chiudi, the undo, is a single tap (docs/protocol.md,
 * Casa Panel's `HoldButton`). `AccessRow` feeds its pointer events and timers
 * through `holdStep` and words its status line with `accessStatus`; neither
 * knows about React or the DOM.
 */
import { tr } from '../i18n';

/** How long Apri must be held. */
export const HOLD_MS = 700;

/** How long `Tieni premuto per aprire` stays after a press too short. */
export const HINT_MS = 2500;

export type Hold = { phase: 'idle' } | { phase: 'holding'; since: number } | { phase: 'hint'; since: number };

export const IDLE: Hold = { phase: 'idle' };

export type HoldEvent =
  /** A finger (or the mouse's main button) goes down on Apri. */
  | { type: 'press'; at: number }
  /** It comes up on Apri. */
  | { type: 'release'; at: number }
  /** It slides off Apri, or the browser takes the pointer away: no open, and no hint. */
  | { type: 'cancel' }
  /** The timer `holdTimeout` asked for has fired. */
  | { type: 'tick'; at: number }
  /** Enter or Space: a keyboard has no hold, so it opens at once. */
  | { type: 'key' };

/** The next state, and whether this step opens the gate. */
export function holdStep(hold: Hold, event: HoldEvent): { hold: Hold; opens: boolean } {
  const stay = { hold, opens: false };
  switch (event.type) {
    case 'press':
      return { hold: { phase: 'holding', since: event.at }, opens: false };
    case 'key':
      return { hold: IDLE, opens: true };
    case 'cancel':
      return hold.phase === 'holding' ? { hold: IDLE, opens: false } : stay;
    case 'release':
      if (hold.phase !== 'holding') return stay;
      // Held long enough, and the timer simply has not fired yet: a release
      // at 700 ms is a hold, not a press too short.
      if (event.at - hold.since >= HOLD_MS) return { hold: IDLE, opens: true };
      return { hold: { phase: 'hint', since: event.at }, opens: false };
    case 'tick':
      if (hold.phase === 'holding' && event.at - hold.since >= HOLD_MS) return { hold: IDLE, opens: true };
      if (hold.phase === 'hint' && event.at - hold.since >= HINT_MS) return { hold: IDLE, opens: false };
      return stay;
  }
}

/** ms until the next `tick` is due, or `null` when nothing is waiting. */
export function holdTimeout(hold: Hold): number | null {
  if (hold.phase === 'holding') return HOLD_MS;
  if (hold.phase === 'hint') return HINT_MS;
  return null;
}

/** Whether a lock in this state is open: the Row then offers Chiudi, not Apri. */
export const isOpenLock = (state: string) => state === 'unlocked' || state === 'open';

/**
 * The status line under a gate's name. `accent` is "on" (ADR-0013): an open
 * gate, a hold under way, the hint about one; `alert` is a Fault.
 * `worded` is the state as `stateLabel` words it everywhere else, for the
 * states this has nothing more specific for.
 */
export function accessStatus(
  lock: { state: string; unavailable: boolean },
  hold: Hold,
  worded: string
): { label: string; tone: 'muted' | 'accent' | 'alert' } {
  if (lock.unavailable) return { label: worded, tone: 'alert' };
  if (isOpenLock(lock.state)) return { label: tr('access.open'), tone: 'accent' };
  if (hold.phase === 'holding' || lock.state === 'unlocking' || lock.state === 'opening')
    return { label: tr('access.opening'), tone: 'accent' };
  if (hold.phase === 'hint') return { label: tr('access.hint'), tone: 'accent' };
  if (lock.state === 'locked') return { label: tr('access.closed'), tone: 'muted' };
  return { label: worded, tone: 'muted' };
}
