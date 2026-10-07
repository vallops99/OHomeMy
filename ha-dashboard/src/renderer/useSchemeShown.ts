/**
 * The scheme a Dashboard shows, light or dark, and when it switches (#70,
 * ADR-0015 "Language and themes").
 *
 * What it should show is `schemeShown` (`theme/schemeShown.ts`), from the
 * Mode, the house's entity, the connection and the device. When it switches
 * is `touchHold` (`./touchHold.ts`): at once, unless a pointer is down on the
 * Dashboard, and then the moment the last one lifts. How it switches is
 * `THEME_FADE_CSS`, added after the first render: every colour token fades
 * over `FADE_MS`, so the first render shows its scheme straight away and
 * every later change fades, whatever caused it.
 *
 * The Builder's preview calls `schemeShown` itself and switches at once.
 */
import { useEffect, useLayoutEffect, useReducer, type RefObject } from 'react';
import type { DashboardSettings } from '../document/types';
import { useConnected, useStateOf } from '../ha';
import { useDeviceScheme } from '../theme/deviceScheme';
import { schemeShown } from '../theme/schemeShown';
import { registerThemeColors, THEME_FADE_CSS } from '../theme/themes';
import type { ColorScheme } from '../theme/tokens';
import { holding, touchHold } from './touchHold';

if (typeof CSS !== 'undefined') registerThemeColors(CSS);

/**
 * The scheme to draw. `root` is an element of the Dashboard: a pointer down
 * anywhere in its shadow root (or its document, on the dev server) holds a
 * switch. `fade` is an empty `<style>` the hook fills with the fade once the
 * first render has settled.
 */
export function useSchemeShown(
  theme: DashboardSettings['theme'],
  root: RefObject<HTMLElement | null>,
  fade: RefObject<HTMLStyleElement | null>
): ColorScheme {
  const device = useDeviceScheme();
  const connected = useConnected();
  const houseState = useStateOf(theme.mode === 'follow-house' ? (theme.entity ?? null) : null);
  const decide = (previous: ColorScheme | null) => schemeShown({ mode: theme.mode, houseState, connected, device, previous });

  const [hold, send] = useReducer(touchHold, null, () => holding(decide(null)));
  const wanted = decide(hold.pending ?? hold.shown);
  useLayoutEffect(() => send({ type: 'want', scheme: wanted }), [wanted]);

  useEffect(() => {
    const where = root.current?.getRootNode();
    if (!where) return;
    // Mice and pens by pointer; fingers from touch events (`touchHold.ts`).
    const mouse = (e: Event) => (e as PointerEvent).pointerType !== 'touch';
    const down = (e: Event) => mouse(e) && send({ type: 'down', id: (e as PointerEvent).pointerId });
    const up = (e: Event) => mouse(e) && send({ type: 'up', id: (e as PointerEvent).pointerId });
    // A capture lost with the button still pressed (its element went away)
    // is not a lift; the lift still reaches the window.
    const lost = (e: Event) => (e as PointerEvent).buttons === 0 && up(e);
    const touches = (e: Event) => send({ type: 'touches', count: (e as TouchEvent).touches.length });
    const releaseAll = () => send({ type: 'release-all' });
    const hidden = () => document.hidden && releaseAll();
    const capture = { capture: true, passive: true };
    const listen: [EventTarget, string, (e: Event) => unknown, AddEventListenerOptions?][] = [
      [where, 'pointerdown', down, capture],
      [where, 'touchstart', touches, capture],
      [window, 'pointerup', up, capture],
      [window, 'pointercancel', up, capture],
      [window, 'lostpointercapture', lost, capture],
      [window, 'touchend', touches, capture],
      [window, 'touchcancel', touches, capture],
      [window, 'blur', releaseAll],
      [document, 'visibilitychange', hidden],
    ];
    for (const [target, type, f, options] of listen) target.addEventListener(type, f, options);
    return () => {
      for (const [target, type, f, options] of listen) target.removeEventListener(type, f, options);
    };
  }, [root]);

  // The fade, after the first render. Reading the computed style first makes
  // the browser settle the first scheme's values, so the transition starts
  // from them, and never fades the first render in from whatever the element
  // held before. React renders the `<style>` empty and leaves its text alone.
  useLayoutEffect(() => {
    if (root.current) void getComputedStyle(root.current).getPropertyValue('--bg');
    if (fade.current) fade.current.textContent = THEME_FADE_CSS;
  }, [root, fade]);

  return hold.shown;
}
