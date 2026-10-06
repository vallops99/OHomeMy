/**
 * One Dashboard on screen (#54): its frame, the Page that is current, and
 * the two behaviours its settings choose, the idle return and the back
 * gesture. Which Page is current is React state (`navigation.ts`, ADR-0006),
 * and every rule here is the same on every device; a Dashboard designed for
 * a phone differs from one designed for a wall only in what its document
 * says.
 *
 * Each Dashboard keeps its own place: the renderer's tree outlives the panel
 * element, and moving to another Dashboard's panel and back finds this one
 * where it was left (`places`); its idle return, if it has one, counts
 * again from then.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Dashboard, Id } from '../document/types';
import { useIdleAfter } from '../ui/idle';
import { useBackGesture } from './backGesture';
import { Frame } from './Frame';
import { atRest, back, canGoBack, currentPage, initialNav, navbarItems, open, reconcile, selectItem, type Nav } from './navigation';
import { DashboardNavigationProvider, type DashboardNavigation } from './navigationContext';
import { Page } from './Page';

type Props = {
  dashboard: Dashboard;
  /** Where each Dashboard was left, kept by the renderer across Dashboards. */
  places: Map<Id, Nav>;
  /** What an empty Page shows, inside the frame so the Navbar stays. */
  empty: ReactNode;
  /** Drawn over the frame inside the Dashboard's navigation: the Popup layer, whose Widgets open Pages here too. */
  overlay?: ReactNode;
};

export function DashboardView({ dashboard, places, empty, overlay }: Props) {
  const [saved, setNav] = useState(() => places.get(dashboard.id) ?? initialNav(dashboard));
  // A Publish may have taken Pages or items away since; forget them.
  const nav = reconcile(saved, dashboard);

  useEffect(() => {
    places.set(dashboard.id, nav);
  }, [places, dashboard.id, nav]);

  // Every change is made against the Dashboard as it is now, not as it was
  // when a handler was made.
  const latest = useRef(dashboard);
  useEffect(() => {
    latest.current = dashboard;
  });
  const update = useCallback((step: (nav: Nav, d: Dashboard) => Nav) => setNav(n => step(n, latest.current)), []);

  const pageId = currentPage(nav, dashboard);
  const page = dashboard.pages.find(p => p.id === pageId);
  const { idle_return, back_history } = dashboard.settings;

  useBackGesture(dashboard.id, back_history && canGoBack(nav, dashboard), `${nav.tab}/${pageId}`, () => update(back));

  // Only away from rest, so a Dashboard left on its Home Page runs no timer.
  useIdleAfter(idle_return !== null && !atRest(nav, dashboard) ? idle_return * 1000 : null, () => update((_, d) => initialNav(d)));

  const navigation = useMemo<DashboardNavigation>(
    () => ({
      page: pageId,
      open: id => update((n, d) => open(n, d, id)),
      pageName: id => dashboard.pages.find(p => p.id === id && p.popup === null)?.name,
    }),
    [pageId, dashboard, update]
  );

  return (
    <DashboardNavigationProvider value={navigation}>
      <Frame navbar={dashboard.navbar} items={navbarItems(nav, dashboard)} onItem={id => update((n, d) => selectItem(n, d, id))}>
        {!page || page.widgets.length === 0 ? (
          empty
        ) : (
          // Keyed by Page, so each opens scrolled to its top.
          <Page key={page.id} page={page} overflow={dashboard.settings.overflow} />
        )}
      </Frame>
      {overlay}
    </DashboardNavigationProvider>
  );
}
