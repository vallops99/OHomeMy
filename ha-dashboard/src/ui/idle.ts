import { useEffect, useRef } from 'react';

/**
 * Idle return, in milliseconds (#14, decision 4). After this long with no
 * interaction on a non-main Page, the panel returns to `page:main` on its
 * own.
 *
 * Shared with the Concern list (#30), which closes after the same spell
 * untouched -- on every Page and on a phone too, where this return never runs.
 *
 * The panel sits at the entrance and its resting state is the house's
 * Verdict (CONTEXT.md); whoever walks up to it next should not find someone
 * else's Area page left open by whoever was last standing here. #2 already
 * established that the panel cannot sense someone *approaching* -- wake is
 * Fully Kiosk's own camera motion, not a Home Assistant entity this code can
 * read -- but it can sense time, which is the only signal left for "this
 * page has been abandoned".
 *
 * 240s and not something shorter: long enough that reading a Page (checking
 * a camera, watching a chip list, adjusting something on an Area's own page)
 * is never interrupted mid-use by a panel that yanks itself home -- a timer
 * that fires while someone is still looking is worse than no timer, because
 * it teaches people to distrust the panel. Long enough, too, that a `1s`
 * flip through this constant's history would find no reason to distinguish
 * "reading" from "walked away" at a shorter interval without real usage data
 * to measure against, which #14 does not have. Short enough that the panel
 * is reliably home by the time the *next* person reaches it, rather than
 * still showing whatever the last visitor opened. 240s is the number that
 * satisfies both without evidence to tune it more precisely; revisit with
 * real usage data if it turns out to be wrong in either direction.
 */
export const IDLE_RETURN_MS = 240_000;

/**
 * Close after `IDLE_RETURN_MS` with no touch anywhere on the panel -- the
 * same spell as the idle return, and on every Page, `page:main` and a phone
 * included, where that return never runs. A touch in a Popup over it is a
 * touch like any other. For the panel-local overlays: the Concern list (#30)
 * and the `select` picker (#36).
 */
export function useIdleClose(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    let timer = setTimeout(() => onCloseRef.current(), IDLE_RETURN_MS);
    const onActivity = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onCloseRef.current(), IDLE_RETURN_MS);
    };
    document.addEventListener('pointerdown', onActivity, true);
    document.addEventListener('keydown', onActivity, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', onActivity, true);
      document.removeEventListener('keydown', onActivity, true);
    };
  }, []);
}
