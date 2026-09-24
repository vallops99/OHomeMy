/**
 * The phone's navigation, as plain data (#15, ADR-0011).
 *
 * On a phone, `page:main`'s Regions become three tabs, and a Page opened from
 * a tab is pushed *inside that tab*: one stack per tab, the way a phone's own
 * apps do it. Switching tabs keeps each tab's place; tapping the tab you are
 * already on takes it back to its root. The wall panel has none of this --
 * it stays flat, one Page at a time (ADR-0006).
 */
import type { PageLayout, Region } from '../ha';

export type Tab = 'casa' | 'stanze' | 'altro';

export const TABS: { key: Tab; label: string; icon: string; regions: Region[] }[] = [
  { key: 'casa', label: 'Casa', icon: 'mdi:home', regions: ['glance', 'left'] },
  { key: 'stanze', label: 'Stanze', icon: 'mdi:sofa', regions: ['right'] },
  { key: 'altro', label: 'Altro', icon: 'mdi:dots-grid', regions: ['footer'] },
];

export type PhoneNav = { tab: Tab; stacks: Record<Tab, string[]> };

export const initialNav: PhoneNav = { tab: 'casa', stacks: { casa: [], stanze: [], altro: [] } };

const withStack = (nav: PhoneNav, stack: string[]): PhoneNav => ({ ...nav, stacks: { ...nav.stacks, [nav.tab]: stack } });

/** The Page on screen: the top of the current tab's stack, or `main` at its root. */
export function currentPage(nav: PhoneNav): string {
  return nav.stacks[nav.tab].at(-1) ?? 'main';
}

/**
 * Open a Page inside the current tab. `main` means home: the tab returns to
 * its root rather than stacking a second copy of the tabs' own Page. Opening
 * the Page already on screen changes nothing.
 */
export function openPage(nav: PhoneNav, page: string): PhoneNav {
  const stack = nav.stacks[nav.tab];
  if (page === 'main') return stack.length === 0 ? nav : withStack(nav, []);
  if (stack.at(-1) === page) return nav;
  return withStack(nav, [...stack, page]);
}

/** One level up in the current tab. At the root there is nothing to do. */
export function back(nav: PhoneNav): PhoneNav {
  const stack = nav.stacks[nav.tab];
  return stack.length === 0 ? nav : withStack(nav, stack.slice(0, -1));
}

/** A tap on a tab: switch to it, or, when it is already the current one, go to its root. */
export function selectTab(nav: PhoneNav, tab: Tab): PhoneNav {
  if (tab !== nav.tab) return { ...nav, tab };
  return nav.stacks[tab].length === 0 ? nav : withStack(nav, []);
}

/**
 * The tabs worth showing: those with something Placed in their Regions on
 * `page:main`. A tab that opens onto nothing is a dead control (ADR-0006,
 * decision 6), so it is left out rather than shown empty. `glance` counts
 * only while the glance toggle lets it render.
 */
export function visibleTabs(main: PageLayout, glanceOn: boolean): Tab[] {
  return TABS.filter(({ regions }) => regions.some(r => (r !== 'glance' || glanceOn) && main[r].length > 0)).map(x => x.key);
}
