/**
 * The OHomeMy document: every Dashboard of the house, as one JSON value
 * (ADR-0015, #48). This file is the one definition the renderer, the Builder
 * and the integration share; `custom_components/ohomemy/document.py` checks
 * the same shape on the server, and a change here is a change there.
 *
 * ## Where it lives
 *
 * The integration keeps it in `.storage/ohomemy.document` beside a
 * `revision`, a counter that goes up by one on every Publish. Any user reads
 * it with `ohomemy/document/get` or `ohomemy/document/subscribe` (the whole
 * document again after every Publish); only an admin Publishes it, with
 * `ohomemy/document/save` naming the revision the Draft started from. The
 * client is `src/ha/document.ts`.
 *
 * ## The shape
 *
 * ```
 * OHomeMyDocument
 * └─ dashboards[]        Dashboard: id, slug, name, show_in_sidebar,
 *    │                   home_page, settings, navbar
 *    ├─ navbar           at most one, on one edge: items[] of { page, icon }
 *    └─ pages[]          Page: a grid of columns x rows, an optional Popup name
 *       └─ widgets[]     Widget: kind, x/y/w/h on the grid, variant, title,
 *                        on_tap, settings
 * ```
 *
 * Order is the order of the arrays: Dashboards as the Builder lists them,
 * Pages as it lists them, Widgets bottom to top where they overlap.
 *
 * ## What the server checks, and what it leaves to the schema module
 *
 * The server checks structure only: every field below present, of its type
 * and vocabulary, and no other; ids unique where they are looked up; every
 * Page reference naming an ordinary (non-Popup) Page of the same Dashboard;
 * every Widget inside its Page's columns, and inside its rows when the
 * Dashboard fits. A Dashboard's slug never changes once Published.
 *
 * `Widget.kind` and `Widget.settings` are open on the server: any string, any
 * object. Which kinds exist and what settings each takes is the shared schema
 * module's business (#50): the Builder offers only valid choices, and the
 * renderer silently skips a Widget it finds invalid. Entity and Area ids in
 * settings are never checked against Home Assistant's registries; the
 * renderer drops what no longer exists, and the document is not rewritten.
 */

/** A string id, unique in its scope (see each field). At most 64 characters. */
export type Id = string;

export type OHomeMyDocument = {
  dashboards: Dashboard[];
};

/** What `get` answers and `subscribe` sends: the document and its revision. */
export type Published = {
  revision: number;
  document: OHomeMyDocument;
};

/** One complete, self-contained panel design (CONTEXT.md, Dashboard). */
export type Dashboard = {
  /** Unique in the document. Never changes; the panel's `config` carries it. */
  id: Id;
  /**
   * The panel's URL is `/ohomemy-<slug>`. Unique in the document, lowercase
   * letters and digits joined by single hyphens, at most 40 characters, and
   * fixed when the Dashboard is created: a rename keeps it.
   */
  slug: string;
  /** Written by the admin and shown as written; the sidebar title. */
  name: string;
  show_in_sidebar: boolean;
  /** The Home Page: an ordinary Page of this Dashboard, never a Popup's. */
  home_page: Id;
  settings: DashboardSettings;
  /** At most one Navbar, or none. */
  navbar: Navbar | null;
  /** At least one: the Home Page. */
  pages: Page[];
};

export const OVERFLOWS = ['fit', 'scroll'] as const;
export const MODES = ['light', 'dark', 'follow-device', 'follow-house'] as const;
/** The Domains `follow-house` may read: each says light or dark in two states. */
export const HOUSE_MODE_DOMAINS = ['sun', 'binary_sensor', 'input_boolean'] as const;
/** What choosing `follow-house` reads until the admin picks another entity. */
export const HOUSE_MODE_DEFAULT = 'sun.sun';

export type DashboardSettings = {
  /**
   * `fit`: each Page is the screen, never scrolls, and a Widget scrolls
   * inside its own box; no Widget may extend past the grid's rows.
   * `scroll`: the Page scrolls, and Widgets may sit below the last row.
   */
  overflow: (typeof OVERFLOWS)[number];
  /**
   * The screen sizes, in CSS pixels, the Dashboard is designed for. The
   * Builder previews `min` and `max`. Outside it the Dashboard still renders.
   */
  supported_range: { min: Size; max: Size };
  /** Seconds idle before returning to the Home Page; `null` never returns. */
  idle_return: number | null;
  /** Whether the back gesture walks the trail of opened Pages. */
  back_history: boolean;
  theme: {
    /** A Theme's name, e.g. `casa-panel`. Which names exist is the frontend's. */
    name: string;
    /**
     * `light` or `dark` always; `follow-device` follows the device's own
     * preference; `follow-house` follows `entity` (CONTEXT.md "Mode",
     * "Follow the house"). Where the house or the device cannot say, the
     * Dashboard is dark.
     */
    mode: (typeof MODES)[number];
    /**
     * Under `follow-house` only, and required there: a `sun`, `binary_sensor`
     * or `input_boolean`, light when `above_horizon` or `on` and dark when
     * `below_horizon` or `off`. Absent under every other Mode.
     */
    entity?: string;
  };
};

/** Width and height in CSS pixels, each at least 1. */
export type Size = { width: number; height: number };

export const EDGES = ['top', 'bottom', 'left', 'right'] as const;

/**
 * The Dashboard's own bar of destinations, along one edge of every Page:
 * horizontal on `top` and `bottom`, vertical on `left` and `right`. The edge
 * is physical; right to left does not flip it.
 */
export type Navbar = {
  edge: (typeof EDGES)[number];
  /** Tabs mode: each item keeps its own trail of opened Pages. */
  tabs: boolean;
  items: NavbarItem[];
};

export type NavbarItem = {
  /** Unique in the Navbar. */
  id: Id;
  /** An ordinary Page of this Dashboard; the item is labelled with its name. */
  page: Id;
  /** An icon name, e.g. `mdi:sofa`. */
  icon: string;
};

/**
 * One screen of a Dashboard, or a Popup's layout. The grid is proportional:
 * `columns` share the Page's width and `rows` share one screen's height, so a
 * Widget's box grows and shrinks with the screen across the supported range.
 */
export type Page = {
  /** Unique in the Dashboard. */
  id: Id;
  /** Written by the admin; shown in the Builder and on Navbar items. */
  name: string;
  /**
   * The Popup this Page lays out, by name, or `null` for an ordinary Page.
   * Unique in the Dashboard. A Popup Page is opened by Home Assistant
   * (`select.ohomemy_popup`), never by a tap, the Navbar or as the Home Page.
   * Never `none`: that is the select's option for no Popup open.
   */
  popup: string | null;
  /** Each between 1 and 96. */
  grid: { columns: number; rows: number };
  widgets: Widget[];
};

export const VARIANTS = ['full', 'compact'] as const;

/** One thing placed on a Page (CONTEXT.md, Widget). */
export type Widget = {
  /** Unique in the Dashboard, so a Widget moved to another Page keeps it. */
  id: Id;
  /** Which Widget this is, e.g. `room_tile`, `link`, `clock`. Open-ended here; see the schema module. */
  kind: string;
  /** Column and row of the top-left cell, from 0. */
  x: number;
  y: number;
  /** Columns and rows spanned, at least 1. `x + w` never exceeds the columns. */
  w: number;
  h: number;
  /** `full` for a kind that has only one form. */
  variant: (typeof VARIANTS)[number];
  /**
   * `null` is unset: the kind's Default title, translated for each viewer.
   * A string is a title someone wrote, shown as written; `''` shows none.
   */
  title: string | null;
  /** An ordinary Page of this Dashboard the Widget opens when tapped, or `null`. */
  on_tap: Id | null;
  /** The kind's own settings. Any JSON object to the server. */
  settings: Record<string, unknown>;
};

/** The document before anyone has built a Dashboard (revision 0). */
export const emptyDocument = (): OHomeMyDocument => ({ dashboards: [] });
