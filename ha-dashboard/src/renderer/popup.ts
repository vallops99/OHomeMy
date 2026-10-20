/**
 * The Popup's pure half (#58, CONTEXT.md "Popup", ADR-0015): which Popup Home
 * Assistant has open, and which of this Dashboard's Pages lays it out.
 *
 * Home Assistant opens a Popup by selecting its name on
 * `select.ohomemy_popup` and closes it by selecting `none`. Every Dashboard
 * reads the same entity, so every Dashboard that lays out a Page for the name
 * shows it, and closing it on one closes it on all. The renderer never keeps
 * a Popup open or closed on its own (ADR-0009).
 *
 * No React, so `popup.test.ts` runs it under plain Node.
 */
import { memberOnTap } from '../document/members';
import type { Dashboard, Page } from '../document/types';

/** The select that opens a Popup, provided by the integration (`select.py`). */
export const POPUP_SELECT = 'select.ohomemy_popup';

/** Its option for no Popup open. No Popup may be named this. */
export const NO_POPUP = 'none';

/**
 * Pressed on a touch inside an open Popup, so an automation can restart its
 * auto-close wait: Home Assistant cannot see touches (`button.py`).
 */
export const POPUP_ACTIVITY = 'button.ohomemy_popup_activity';

/** How often, at most, a touch is reported. */
export const ACTIVITY_INTERVAL_MS = 5_000;

/**
 * The open Popup's name, or `null`. A select that does not exist (the
 * integration's entry not loaded) arrives as `null`; one that is unavailable
 * or unknown arrives as that state. All of them mean closed.
 */
export function openPopup(select: { state: string; unavailable: boolean } | null): string | null {
  if (select === null || select.unavailable) return null;
  const name = select.state;
  return name === '' || name === NO_POPUP || name === 'unknown' ? null : name;
}

/** The Page of `dashboard` that lays out the Popup `name`, or `null` if it defines none. */
export function popupPage(dashboard: Dashboard, name: string | null): Page | null {
  if (name === null) return null;
  return dashboard.pages.find(p => p.popup === name) ?? null;
}

/**
 * Whether tapping this Widget of the Popup's Page, or its Member for the
 * entity `member` (#73), opens a Page. Navigating from inside a Popup closes
 * it, everywhere: the Page opens underneath, on this Dashboard, and the
 * select goes back to `none`.
 */
export function opensPage(page: Page, widgetId: string | null, member: string | null = null): boolean {
  const widget = widgetId === null ? undefined : page.widgets.find(w => w.id === widgetId);
  if (!widget) return false;
  return member === null ? widget.on_tap !== null : memberOnTap(widget, member) !== null;
}

/**
 * Paces the activity reports: `true` for a touch that should be reported,
 * then `false` until `intervalMs` has passed since the last one reported.
 * Touches in between are dropped, not queued: the automation only needs to
 * know someone is still there.
 */
export function activityGate(intervalMs: number): (now: number) => boolean {
  let last: number | null = null;
  return now => {
    if (last !== null && now - last < intervalMs) return false;
    last = now;
    return true;
  };
}
