/**
 * What the Builder does to one Dashboard's Pages, settings and Navbar (#56):
 * add, rename and remove a Page, choose the Home Page, set a Page's grid,
 * and edit the Dashboard's settings and Navbar.
 *
 * Every edit keeps the Dashboard one the server accepts
 * (`custom_components/ohomemy/document.py`): every Page reference names an
 * ordinary Page of the Dashboard, every Widget lies on its grid, and the
 * supported range's `min` never exceeds its `max`. An edit that cannot be
 * made so is refused by returning the Dashboard as it was; the Builder's
 * controls offer only what `minimumGrid` and `canFit` allow, so the admin
 * never meets a refusal.
 *
 * No React: `pages.test.ts` runs this under plain Node. Ids come from the
 * caller, as in `draft.ts`.
 */
import { mapMemberTaps } from '../document/members';
import {
  HOUSE_MODE_DEFAULT,
  HOUSE_MODE_DOMAINS,
  type Dashboard,
  type DashboardSettings,
  type Navbar,
  type NavbarItem,
  type OHomeMyDocument,
  type Page,
  type Size,
} from '../document/types';
import { mapPage, minimumGrid } from './layout';

/** The document with one Dashboard changed. */
export function mapDashboard(document: OHomeMyDocument, id: string, f: (d: Dashboard) => Dashboard): OHomeMyDocument {
  return { ...document, dashboards: document.dashboards.map(d => (d.id === id ? f(d) : d)) };
}

/** The Pages a tap, a Navbar item or the Home Page may open: never a Popup's. */
export const ordinaryPages = (dashboard: Dashboard) => dashboard.pages.filter(p => p.popup === null);

/** A new empty ordinary Page after the last, with the grid of the Page it was added from. */
export function addPage(dashboard: Dashboard, page: { id: string; name: string; grid: Page['grid'] }): Dashboard {
  const added: Page = { id: page.id, name: page.name.trim(), popup: null, grid: { ...page.grid }, widgets: [] };
  return { ...dashboard, pages: [...dashboard.pages, added] };
}

/** The Page renamed; refused for a blank name, which the server refuses. */
export function renamePage(dashboard: Dashboard, pageId: string, name: string): Dashboard {
  if (name.trim() === '') return dashboard;
  return mapPage(dashboard, pageId, p => ({ ...p, name: name.trim() }));
}

/**
 * The Page gone with its Widgets, and every reference to it with it: a
 * Widget or a Member that opened it opens nothing, and a Navbar item for it goes. The
 * Home Page cannot be removed (choose another first), nor the last Page.
 */
export function removePage(dashboard: Dashboard, pageId: string): Dashboard {
  if (pageId === dashboard.home_page || dashboard.pages.length <= 1) return dashboard;
  return {
    ...dashboard,
    navbar: dashboard.navbar && { ...dashboard.navbar, items: dashboard.navbar.items.filter(i => i.page !== pageId) },
    pages: dashboard.pages
      .filter(p => p.id !== pageId)
      .map(p => ({
        ...p,
        widgets: p.widgets.map(w => mapMemberTaps(w.on_tap === pageId ? { ...w, on_tap: null } : w, to => (to === pageId ? null : to))),
      })),
  };
}

/** The Page moved one place earlier (`-1`) or later (`1`) in the list. */
export function movePage(dashboard: Dashboard, pageId: string, by: -1 | 1): Dashboard {
  const pages = [...dashboard.pages];
  const i = pages.findIndex(p => p.id === pageId);
  const j = i + by;
  if (i < 0 || j < 0 || j >= pages.length) return dashboard;
  [pages[i], pages[j]] = [pages[j], pages[i]];
  return { ...dashboard, pages };
}

/** The Dashboard opening on this Page; refused for a Popup's. */
export function setHomePage(dashboard: Dashboard, pageId: string): Dashboard {
  return ordinaryPages(dashboard).some(p => p.id === pageId) ? { ...dashboard, home_page: pageId } : dashboard;
}

export const GRID_MAX = 96;

/**
 * The Page's grid resized. Refused below `minimumGrid` (rows only count when
 * the Dashboard fits) and outside 1 to 96.
 */
export function setGrid(dashboard: Dashboard, pageId: string, grid: Page['grid']): Dashboard {
  const page = dashboard.pages.find(p => p.id === pageId);
  if (!page) return dashboard;
  const least = minimumGrid(page);
  const rowsLeast = dashboard.settings.overflow === 'fit' ? least.rows : 1;
  const ok = (n: number, min: number) => Number.isInteger(n) && n >= min && n <= GRID_MAX;
  if (!ok(grid.columns, least.columns) || !ok(grid.rows, rowsLeast)) return dashboard;
  return mapPage(dashboard, pageId, p => ({ ...p, grid: { columns: grid.columns, rows: grid.rows } }));
}

/**
 * Whether the Dashboard can be set to fit: every Widget on every Page lies
 * within its Page's rows. A scrolling Dashboard may have Widgets below.
 */
export function canFit(dashboard: Dashboard): boolean {
  return dashboard.pages.every(p => minimumGrid(p).rows <= p.grid.rows);
}

/**
 * Some of the Dashboard's settings replaced. Refused when the result would
 * not be valid: fit with a Widget below its Page's rows, a supported range
 * whose `min` exceeds its `max` or holds a size below one pixel, or an idle
 * return under one second.
 */
export function setSettings(dashboard: Dashboard, patch: Partial<DashboardSettings>): Dashboard {
  const settings = { ...dashboard.settings, ...patch };
  const next = { ...dashboard, settings };
  if (settings.overflow === 'fit' && !canFit(next)) return dashboard;
  const { min, max } = settings.supported_range;
  if (![min, max].every(validSize) || min.width > max.width || min.height > max.height) return dashboard;
  if (settings.idle_return !== null && !(Number.isInteger(settings.idle_return) && settings.idle_return >= 1)) return dashboard;
  if (!validTheme(settings.theme)) return dashboard;
  return next;
}

type Theme = DashboardSettings['theme'];

/** The house entity is there exactly under `follow-house`, and is one of its Domains. */
const validTheme = (theme: Theme) =>
  theme.mode === 'follow-house' ? theme.entity !== undefined && isHouseModeEntity(theme.entity) : !('entity' in theme);

/** Whether `id` is an entity `follow-house` may read: a sun, binary sensor or boolean. */
export const isHouseModeEntity = (id: string) =>
  (HOUSE_MODE_DOMAINS as readonly string[]).includes(id.slice(0, id.indexOf('.'))) && /^[a-z0-9_]+\.[a-z0-9_]+$/.test(id);

/**
 * The Mode set (#70). Choosing `follow-house` reads `sun.sun` until the admin
 * picks another entity, and keeps one already picked; any other Mode drops
 * the entity, so the document holds it only where it is read.
 */
export function setMode(dashboard: Dashboard, mode: Theme['mode']): Dashboard {
  const { name, entity } = dashboard.settings.theme;
  const theme: Theme = mode === 'follow-house' ? { name, mode, entity: entity ?? HOUSE_MODE_DEFAULT } : { name, mode };
  return setSettings(dashboard, { theme });
}

/** The entity `follow-house` reads; refused under any other Mode, or outside its Domains. */
export function setHouseEntity(dashboard: Dashboard, entity: string): Dashboard {
  const theme = dashboard.settings.theme;
  if (theme.mode !== 'follow-house') return dashboard;
  return setSettings(dashboard, { theme: { ...theme, entity } });
}

const validSize = (s: Size) => [s.width, s.height].every(n => Number.isInteger(n) && n >= 1);

/**
 * One end of the supported range set; the other end follows if it would
 * otherwise cross it, so typing a larger smallest size never gets refused.
 */
export function setRangeEnd(dashboard: Dashboard, end: 'min' | 'max', size: Size): Dashboard {
  if (!validSize(size)) return dashboard;
  const range = { ...dashboard.settings.supported_range, [end]: size };
  const other = end === 'min' ? 'max' : 'min';
  const pick = end === 'min' ? Math.max : Math.min;
  range[other] = { width: pick(range[other].width, size.width), height: pick(range[other].height, size.height) };
  return setSettings(dashboard, { supported_range: range });
}

// --- The Navbar ------------------------------------------------------------

/**
 * A Navbar, at the bottom edge, with one item for the Home Page; or none.
 * `itemId` names the first item.
 */
export function setNavbar(dashboard: Dashboard, on: boolean, itemId: string): Dashboard {
  if (!on) return { ...dashboard, navbar: null };
  if (dashboard.navbar) return dashboard;
  return { ...dashboard, navbar: { edge: 'bottom', tabs: false, items: [{ id: itemId, page: dashboard.home_page, icon: 'mdi:home' }] } };
}

/** The Navbar's edge or Tabs mode changed. */
export function setNavbarFields(dashboard: Dashboard, patch: Partial<Pick<Navbar, 'edge' | 'tabs'>>): Dashboard {
  return dashboard.navbar ? { ...dashboard, navbar: { ...dashboard.navbar, ...patch } } : dashboard;
}

/** An item added at the end of the Navbar; refused for a Page that is not ordinary. */
export function addNavbarItem(dashboard: Dashboard, item: NavbarItem): Dashboard {
  if (!dashboard.navbar || !ordinaryPages(dashboard).some(p => p.id === item.page)) return dashboard;
  return { ...dashboard, navbar: { ...dashboard.navbar, items: [...dashboard.navbar.items, item] } };
}

/** An item's Page or icon changed; refused for a Page that is not ordinary. */
export function updateNavbarItem(dashboard: Dashboard, itemId: string, patch: Partial<Omit<NavbarItem, 'id'>>): Dashboard {
  if (!dashboard.navbar) return dashboard;
  if (patch.page !== undefined && !ordinaryPages(dashboard).some(p => p.id === patch.page)) return dashboard;
  return {
    ...dashboard,
    navbar: { ...dashboard.navbar, items: dashboard.navbar.items.map(i => (i.id === itemId ? { ...i, ...patch } : i)) },
  };
}

export function removeNavbarItem(dashboard: Dashboard, itemId: string): Dashboard {
  if (!dashboard.navbar) return dashboard;
  return { ...dashboard, navbar: { ...dashboard.navbar, items: dashboard.navbar.items.filter(i => i.id !== itemId) } };
}

export function moveNavbarItem(dashboard: Dashboard, itemId: string, by: -1 | 1): Dashboard {
  if (!dashboard.navbar) return dashboard;
  const items = [...dashboard.navbar.items];
  const i = items.findIndex(it => it.id === itemId);
  const j = i + by;
  if (i < 0 || j < 0 || j >= items.length) return dashboard;
  [items[i], items[j]] = [items[j], items[i]];
  return { ...dashboard, navbar: { ...dashboard.navbar, items } };
}
