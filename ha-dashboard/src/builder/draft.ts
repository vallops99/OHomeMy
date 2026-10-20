/**
 * What the Builder does to a Draft's Dashboards (#55): create, rename,
 * duplicate and delete. Each takes a document and returns a new one, never
 * changing its argument, so a Draft can be compared with what it began from.
 *
 * Ids are made by the caller (`newId`), so the tests can name them.
 * Laying out Pages and Widgets is #56's.
 */
import { mapMemberTaps } from '../document/members';
import type { Dashboard, OHomeMyDocument, Page } from '../document/types';

export type NewId = () => string;

/**
 * A random id for the Builder to make things with. Not `crypto.randomUUID`:
 * that exists only in a secure context, and Home Assistant is often opened
 * over plain http on the house's network.
 */
export const randomId: NewId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');

/** What the admin chooses when making a Dashboard. The slug is fixed from then on. */
export type DashboardFields = { name: string; slug: string };

/** Why a name cannot be used, or `null`. The server refuses a blank one. */
export function nameProblem(name: string): 'empty' | null {
  return name.trim() === '' ? 'empty' : null;
}

/**
 * A new Dashboard with one empty Page, its Home Page, sized for Casa Panel's
 * 1280x800 wall tablet. `homePageName` is the Page's name, written into the
 * document as if the admin had typed it.
 */
export function newDashboard(fields: DashboardFields, homePageName: string, newId: NewId): Dashboard {
  const home: Page = { id: newId(), name: homePageName, popup: null, grid: { columns: 12, rows: 8 }, widgets: [] };
  return {
    id: newId(),
    slug: fields.slug,
    name: fields.name.trim(),
    show_in_sidebar: true,
    home_page: home.id,
    settings: {
      overflow: 'fit',
      supported_range: { min: { width: 1280, height: 800 }, max: { width: 1280, height: 800 } },
      idle_return: null,
      back_history: true,
      // Casa Panel has only its dark values so far (ADR-0013).
      theme: { name: 'casa-panel', mode: 'dark' },
    },
    navbar: null,
    pages: [home],
  };
}

/** `dashboard` added at the end of the list. */
export function addDashboard(document: OHomeMyDocument, dashboard: Dashboard): OHomeMyDocument {
  return { ...document, dashboards: [...document.dashboards, dashboard] };
}

/** The Dashboard renamed. Its slug, and so its URL, stays. */
export function renameDashboard(document: OHomeMyDocument, id: string, name: string): OHomeMyDocument {
  return mapDashboard(document, id, d => ({ ...d, name: name.trim() }));
}

export function deleteDashboard(document: OHomeMyDocument, id: string): OHomeMyDocument {
  return { ...document, dashboards: document.dashboards.filter(d => d.id !== id) };
}

/**
 * A copy of the Dashboard, under `fields`, placed right after it. Every id in
 * it is new: the Dashboard's, each Page's, Widget's and Navbar item's. Only
 * the Dashboard's has to be (the others are unique per Dashboard), but a copy
 * sharing ids with its original would make any later move between the two
 * ambiguous. Every reference to a Page follows it to its new id.
 */
export function duplicateDashboard(
  document: OHomeMyDocument,
  id: string,
  fields: DashboardFields,
  newId: NewId
): { document: OHomeMyDocument; dashboard: Dashboard } {
  const index = document.dashboards.findIndex(d => d.id === id);
  if (index < 0) throw new Error(`No Dashboard ${id}`);
  const original = document.dashboards[index];

  const pageIds = new Map(original.pages.map(p => [p.id, newId()]));
  const page = (pageId: string) => pageIds.get(pageId) ?? pageId;
  const copy: Dashboard = structuredClone({
    ...original,
    id: newId(),
    slug: fields.slug,
    name: fields.name.trim(),
    home_page: page(original.home_page),
    navbar: original.navbar && {
      ...original.navbar,
      items: original.navbar.items.map(item => ({ ...item, id: newId(), page: page(item.page) })),
    },
    pages: original.pages.map(p => ({
      ...p,
      id: page(p.id),
      widgets: p.widgets.map(w => mapMemberTaps({ ...w, id: newId(), on_tap: w.on_tap === null ? null : page(w.on_tap) }, page)),
    })),
  });

  const dashboards = [...document.dashboards];
  dashboards.splice(index + 1, 0, copy);
  return { document: { ...document, dashboards }, dashboard: copy };
}

/** How a Draft's Dashboard differs from the published one with its id. */
export type Change = 'new' | 'changed';

/**
 * What a Publish of `draft` over `base` would do to each Dashboard: which
 * are new or changed (by id), and which would be deleted.
 */
export function dashboardChanges(base: OHomeMyDocument, draft: OHomeMyDocument): { changes: Map<string, Change>; deleted: Dashboard[] } {
  const before = new Map(base.dashboards.map(d => [d.id, d]));
  const changes = new Map<string, Change>();
  for (const d of draft.dashboards) {
    const was = before.get(d.id);
    if (!was) changes.set(d.id, 'new');
    else if (!sameJson(was, d)) changes.set(d.id, 'changed');
  }
  const kept = new Set(draft.dashboards.map(d => d.id));
  return { changes, deleted: base.dashboards.filter(d => !kept.has(d.id)) };
}

/**
 * Whether two JSON values are the same, whatever the order of their keys: a
 * document that went to the server and back may not keep it.
 */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => sameJson(v, b[i]));
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  const rb = b as Record<string, unknown>;
  return ka.length === kb.length && ka.every(k => k in rb && sameJson((a as Record<string, unknown>)[k], rb[k]));
}

function mapDashboard(document: OHomeMyDocument, id: string, f: (d: Dashboard) => Dashboard): OHomeMyDocument {
  return { ...document, dashboards: document.dashboards.map(d => (d.id === id ? f(d) : d)) };
}
