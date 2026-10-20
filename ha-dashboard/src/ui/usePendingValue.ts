/**
 * The value a slider shows: the finger while held, then the released value
 * until Home Assistant catches up (`pending.ts`), then the live value.
 *
 * `hold` follows the finger, `release` ends the gesture with the value it
 * left. A new hold replaces whatever is pending. A timer clears the pending
 * value when `PENDING_MS` runs out, so the bar falls back on its own rather
 * than on the next unrelated render.
 */
import { useEffect, useRef, useState } from 'react';
import { pendingShown, PENDING_MS, type Pending } from './pending';

export function usePendingValue(live: number) {
  const [held, setHeld] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  // The release is watched on `window` from a listener added at the press,
  // so it reads the live value at the commit through this, not its closure.
  const liveRef = useRef(live);
  liveRef.current = live;

  // Once the live value moves, or the time runs out, the pending value is
  // done with: dropped, it cannot come back should the live value return.
  useEffect(() => {
    if (pending === null) return;
    if (pending.from !== live) {
      setPending(null);
      return;
    }
    const timer = setTimeout(() => setPending(null), Math.max(0, pending.at + PENDING_MS - Date.now()));
    return () => clearTimeout(timer);
  }, [pending, live]);

  return {
    shown: held ?? pendingShown(pending, live, Date.now()),
    hold: (value: number) => setHeld(value),
    release: (value: number) => {
      setHeld(null);
      setPending({ value, from: liveRef.current, at: Date.now() });
    },
  };
}
