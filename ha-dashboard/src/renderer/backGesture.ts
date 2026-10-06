/**
 * The back gesture, for a Dashboard whose `back_history` is on (#54).
 *
 * Pages are still state, not URLs (ADR-0006), but a phone has a back gesture
 * and a browser has a back button, and with nothing for them to consume they
 * leave the Dashboard from three Pages deep. So this keeps ADR-0011's single
 * history entry, now for any Dashboard that asks for it: while the trail has
 * somewhere to go back to, one entry, at the same URL, sits on top of the
 * page's own, and a back consumes it and steps back one Page. It is armed
 * again while the trail still has somewhere to go. Getting home any other
 * way (the Navbar, the idle return) takes the entry back out, so a back at
 * home always leaves, as it does in any app. With `back_history` off no
 * entry is ever made: back leaves the Dashboard wherever it is, which is
 * what a wall with no back button wants.
 *
 * The entry carries the Dashboard's id in its state. Inside Home Assistant
 * other panels push their own entries over it, and the React tree outlives
 * the panel element (`panel/tree.ts`), so this still listens while another
 * panel is on screen. The state tells the cases apart: arriving back on the
 * entry is not a step back, and a back that lands at another path (inside
 * another panel) is none of this Dashboard's business.
 */
import { useEffect, useRef } from 'react';

const KEY = 'ohomemy_back';

const onEntry = (dashboard: string) => (window.history.state as Record<string, unknown> | null)?.[KEY] === dashboard;

/**
 * `wanted`: whether there is somewhere to go back to (and `back_history` is
 * on). `step` names where the trail is now, so that a back from two Pages
 * deep to one, which leaves `wanted` true but has spent the entry, arms it
 * again.
 */
export function useBackGesture(dashboard: string, wanted: boolean, step: string, onBack: () => void) {
  // Remounted on the entry (back from another Dashboard's panel): it is ours.
  const armed = useRef(onEntry(dashboard));
  const path = useRef(window.location.pathname);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (wanted && !armed.current) {
      if (!onEntry(dashboard)) window.history.pushState({ [KEY]: dashboard }, '');
      armed.current = true;
      path.current = window.location.pathname;
    } else if (!wanted && armed.current) {
      armed.current = false;
      // Only while the entry is the one on screen: from another panel, a
      // back here would take the person somewhere they did not ask to go.
      if (onEntry(dashboard)) window.history.back();
    }
  }, [dashboard, wanted, step]);

  useEffect(() => {
    const onPop = () => {
      if (onEntry(dashboard)) {
        armed.current = true;
        return;
      }
      if (!armed.current || window.location.pathname !== path.current) return;
      armed.current = false;
      onBackRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [dashboard]);
}
