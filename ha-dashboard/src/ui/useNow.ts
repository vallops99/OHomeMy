/**
 * The current time, re-read on every turn of the minute: the Clock's, both
 * the label-driven one and the Clock Widget (#50).
 */
import { useEffect, useState } from 'react';
import { msToNextMinute } from './clock';

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // A chain of timeouts rather than an interval: each one is re-aimed at
    // the next minute, so the Clock never drifts off it.
    const id = setTimeout(() => setNow(new Date()), msToNextMinute(new Date()));
    return () => clearTimeout(id);
  }, [now]);
  return now;
}
