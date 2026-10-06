/**
 * Which Dashboard, and which of its Pages, the renderer shows (#50).
 *
 * No React, so `select.test.ts` runs it under plain Node.
 */
import type { Dashboard, OHomeMyDocument, Page } from '../document/types';

/**
 * How the renderer is told its Dashboard. Inside Home Assistant the panel's
 * `config.dashboard_id` names it by id (ADR-0015). On the dev server,
 * `?dashboard=<slug>` names it by the slug in its panel's URL, which is the
 * name a person can read off the sidebar.
 */
export type DashboardRef = { by: 'id'; id: string } | { by: 'slug'; slug: string };

export function dashboardRef(panelConfig: Record<string, unknown> | null | undefined, search: string): DashboardRef | null {
  const id = panelConfig?.dashboard_id;
  if (typeof id === 'string' && id !== '') return { by: 'id', id };
  const slug = new URLSearchParams(search).get('dashboard');
  return slug ? { by: 'slug', slug } : null;
}

/**
 * What there is to show:
 *
 * - `page`: the Dashboard and its Home Page, which may have no Widgets;
 * - `missing`: the document has Dashboards, but not this one (deleted, or a
 *   panel left over from a document since restored from a backup);
 * - `none`: nobody has built a Dashboard yet.
 */
export type Selection = { state: 'page'; dashboard: Dashboard; page: Page } | { state: 'missing' } | { state: 'none' };

export function selectHomePage(document: OHomeMyDocument, ref: DashboardRef | null): Selection {
  if (document.dashboards.length === 0) return { state: 'none' };
  const dashboard = ref && document.dashboards.find(d => (ref.by === 'id' ? d.id === ref.id : d.slug === ref.slug));
  if (!dashboard) return { state: 'missing' };
  // The server guarantees the Home Page exists and is not a Popup's; the
  // fallback only keeps a hand-edited store from blanking the screen.
  const page = dashboard.pages.find(p => p.id === dashboard.home_page && p.popup === null) ?? dashboard.pages.find(p => p.popup === null);
  return page ? { state: 'page', dashboard, page } : { state: 'missing' };
}
