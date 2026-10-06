/**
 * Which Page of a Dashboard is on screen, and how a tap changes it (#54).
 *
 * Pages are state, not a router (ADR-0006, kept by ADR-0015): no route
 * table, no URL per Page, no deep links. What ADR-0015 changed is who
 * decides: the admin, explicitly, through a Widget's `on_tap`, a Link and the
 * Navbar. So this is one set of rules for every Dashboard, wall or phone; a
 * Dashboard's settings and Navbar choose between behaviours, and nothing here
 * asks what device it is on.
 *
 * ## The trail
 *
 * Every Page opened is pushed on a trail over a root Page, and back walks it
 * (the back gesture, when the Dashboard's `back_history` is on). Opening the
 * root, or a Page already in the trail, goes back to it rather than piling
 * up a loop, so the trail is always a simple path home.
 *
 * Without Tabs there is one trail, over the Home Page, and a Navbar item is
 * just another way to open its Page. In Tabs mode each Navbar item keeps its
 * own trail over its own Page, as ADR-0011's phone tabs did: switching items
 * keeps each where it was, tapping the current item takes it back to its
 * Page, and a Page opens inside the item it was opened from, even one that is
 * another item's. When no item opens the Home Page, the Home Page keeps a
 * trail of its own, shown until an item is tapped.
 *
 * ## At rest
 *
 * The state a Dashboard opens in: the Home Page, every trail empty. The idle
 * return goes back to it.
 *
 * A Publish can delete Pages and Navbar items under the state; `reconcile`
 * forgets them, and every function here reconciles first.
 *
 * No React, so `navigation.test.ts` runs it under plain Node.
 */
import type { Dashboard, Id, NavbarItem } from '../document/types';

export type Nav = {
  /** In Tabs mode the Navbar item on screen, or `null` for the Home Page's own trail; always `null` without Tabs. */
  tab: Id | null;
  /** The trail over the Home Page: every Page without Tabs, or the Home Page's own in Tabs mode. */
  home: Id[];
  /** Each Navbar item's trail over its own Page, in Tabs mode. Missing is empty. */
  tabs: Readonly<Record<Id, Id[]>>;
};

/**
 * The longest trail kept. A wall flipping between Pages all day would grow
 * one for ever; past this, the oldest Pages are dropped, and back stops short
 * of home there (the Navbar and the idle return still get there).
 */
export const MAX_TRAIL = 24;

const tabbed = (d: Dashboard) => d.navbar?.tabs === true;

const opens = (d: Dashboard, page: Id) => d.pages.some(p => p.id === page && p.popup === null);

/** The Navbar's items that open a Page of this Dashboard; the server guarantees all do. */
const items = (d: Dashboard): NavbarItem[] => (d.navbar?.items ?? []).filter(i => opens(d, i.page));

const item = (d: Dashboard, id: Id | null) => (id === null ? undefined : items(d).find(i => i.id === id));

/** In Tabs mode, the item that opens the Home Page, which a Dashboard starts on. */
function homeTab(d: Dashboard): Id | null {
  if (!tabbed(d)) return null;
  return items(d).find(i => i.page === d.home_page)?.id ?? null;
}

export function initialNav(d: Dashboard): Nav {
  return { tab: homeTab(d), home: [], tabs: {} };
}

/** Forgets Pages and items a Publish removed. Returns `nav` itself when nothing is gone. */
export function reconcile(nav: Nav, d: Dashboard): Nav {
  const tab = tabbed(d) ? (item(d, nav.tab) ? nav.tab : nav.tab === null ? null : homeTab(d)) : null;
  const home = nav.home.filter(p => opens(d, p));
  const tabs: Record<Id, Id[]> = {};
  let changed = tab !== nav.tab || home.length !== nav.home.length;
  for (const [id, trail] of Object.entries(nav.tabs)) {
    const kept = item(d, id) && tabbed(d) ? trail.filter(p => opens(d, p)) : [];
    if (kept.length !== trail.length) changed = true;
    if (kept.length > 0) tabs[id] = kept;
  }
  return changed ? { tab, home, tabs } : nav;
}

const trailOf = (nav: Nav): Id[] => (nav.tab === null ? nav.home : (nav.tabs[nav.tab] ?? []));

const withTrail = (nav: Nav, trail: Id[]): Nav =>
  nav.tab === null ? { ...nav, home: trail } : { ...nav, tabs: { ...nav.tabs, [nav.tab]: trail } };

/** The Page the current trail starts from: the current item's in Tabs mode, else the Home Page. */
function rootPage(nav: Nav, d: Dashboard): Id {
  return item(d, nav.tab)?.page ?? d.home_page;
}

/** The Page on screen. */
export function currentPage(nav: Nav, d: Dashboard): Id {
  const n = reconcile(nav, d);
  return trailOf(n).at(-1) ?? rootPage(n, d);
}

/** Open a Page: a Widget's `on_tap`, a Link, or a Navbar item without Tabs. */
export function open(nav: Nav, d: Dashboard, page: Id): Nav {
  const n = reconcile(nav, d);
  if (!opens(d, page)) return n;
  const trail = trailOf(n);
  if (page === (trail.at(-1) ?? rootPage(n, d))) return n;
  if (page === rootPage(n, d)) return withTrail(n, []);
  const at = trail.indexOf(page);
  if (at >= 0) return withTrail(n, trail.slice(0, at + 1));
  return withTrail(n, [...trail, page].slice(-MAX_TRAIL));
}

/** One step back along the current trail; at its root, nothing. */
export function back(nav: Nav, d: Dashboard): Nav {
  const n = reconcile(nav, d);
  const trail = trailOf(n);
  return trail.length === 0 ? n : withTrail(n, trail.slice(0, -1));
}

export function canGoBack(nav: Nav, d: Dashboard): boolean {
  return trailOf(reconcile(nav, d)).length > 0;
}

/** A tap on a Navbar item. */
export function selectItem(nav: Nav, d: Dashboard, id: Id): Nav {
  const n = reconcile(nav, d);
  const target = item(d, id);
  if (!target) return n;
  if (!tabbed(d)) return open(n, d, target.page);
  if (n.tab !== id) return { ...n, tab: id };
  return trailOf(n).length === 0 ? n : withTrail(n, []);
}

/** Whether the Dashboard is as it opened: what the idle return waits for, and restores. */
export function atRest(nav: Nav, d: Dashboard): boolean {
  const n = reconcile(nav, d);
  return n.tab === homeTab(d) && n.home.length === 0 && Object.keys(n.tabs).length === 0;
}

/** One Navbar item, ready to draw. */
export type NavbarEntry = {
  id: Id;
  page: Id;
  icon: string;
  /** The Page's name, as the admin wrote it. */
  name: string;
  /**
   * In Tabs mode the item on screen, wherever its trail has got to; without
   * Tabs, an item whose Page is on screen.
   */
  current: boolean;
  /** In Tabs mode, another item with a Page open over its own, waiting where it was left. */
  pageOpen: boolean;
};

export function navbarItems(nav: Nav, d: Dashboard): NavbarEntry[] {
  const n = reconcile(nav, d);
  const shown = currentPage(n, d);
  return items(d).map(i => {
    const current = tabbed(d) ? i.id === n.tab : i.page === shown;
    return {
      id: i.id,
      page: i.page,
      icon: i.icon,
      name: d.pages.find(p => p.id === i.page)?.name ?? '',
      current,
      pageOpen: tabbed(d) && !current && (n.tabs[i.id]?.length ?? 0) > 0,
    };
  });
}
