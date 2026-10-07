/**
 * Every word the Dashboard screen shows (#56): the catalogues' `builder.dashboard.*`
 * keys (#59), reached as `strings.dashboard` (`strings.ts`) and shaped as
 * the Dashboard screen's components read them. Getters and functions, as there, so each
 * word is the viewer's language at the moment it is shown.
 *
 * The one string here that ends up in the document is `newPageName`, the
 * name a new Page starts with, which the admin may change.
 */
import { isKey, tr, trKey } from '../i18n';

/**
 * The words under `prefix`, by the last part of their key (`kinds.clock`
 * from `builder.dashboard.kind.clock`), for a name looked up from data: a kind, a
 * setting, an option. One with no word is `undefined`, for the caller to
 * name from its id.
 */
function words(prefix: string): Record<string, string> {
  return new Proxy({} as Record<string, string>, {
    get: (_, name) => {
      const key = `${prefix}.${String(name)}`;
      return isKey(key) ? trKey(key) : undefined;
    },
  });
}

export const dashboardStrings = {
  get open() {
    return tr('builder.dashboard.open');
  },
  get back() {
    return tr('builder.dashboard.back');
  },
  editing: (name: string) => tr('builder.dashboard.editing', { name }),

  pages: {
    get label() {
      return tr('builder.dashboard.pages.label');
    },
    get add() {
      return tr('builder.dashboard.pages.add');
    },
    get home() {
      return tr('builder.dashboard.pages.home');
    },
    popup: (name: string) => tr('builder.dashboard.pages.popup', { name }),
  },

  newPageName: (n: number) => tr('builder.dashboard.newPageName', { n }),

  size: {
    get label() {
      return tr('builder.dashboard.size.label');
    },
    get smallest() {
      return tr('builder.dashboard.size.smallest');
    },
    get largest() {
      return tr('builder.dashboard.size.largest');
    },
    dims: (width: number, height: number) => tr('builder.dashboard.size.dims', { width, height }),
    notFitting: (n: number, width: number, height: number) => tr('builder.dashboard.size.notFitting', { count: n, width, height }),
    allFit: (width: number, height: number) => tr('builder.dashboard.size.allFit', { width, height }),
    get fitRule() {
      return tr('builder.dashboard.size.fitRule');
    },
  },

  palette: {
    get label() {
      return tr('builder.dashboard.palette.label');
    },
    get hint() {
      return tr('builder.dashboard.palette.hint');
    },
    get full() {
      return tr('builder.dashboard.palette.full');
    },
  },

  preview: {
    label: (page: string) => tr('builder.dashboard.preview.label', { page }),
    get notShown() {
      return tr('builder.dashboard.preview.notShown');
    },
    get notFitting() {
      return tr('builder.dashboard.preview.notFitting');
    },
    get refused() {
      return tr('builder.dashboard.preview.refused');
    },
    get resize() {
      return tr('builder.dashboard.preview.resize');
    },
    get rule() {
      return tr('builder.dashboard.preview.rule');
    },
  },

  tabs: {
    get widget() {
      return tr('builder.dashboard.tabs.widget');
    },
    get page() {
      return tr('builder.dashboard.tabs.page');
    },
    get dashboard() {
      return tr('builder.dashboard.tabs.dashboard');
    },
  },

  widget: {
    get none() {
      return tr('builder.dashboard.widget.none');
    },
    get delete() {
      return tr('builder.dashboard.widget.delete');
    },
    place: (x: number, y: number, w: number, h: number) => tr('builder.dashboard.widget.place', { column: x + 1, row: y + 1, w, h }),
    get noPage() {
      return tr('builder.dashboard.widget.noPage');
    },
    notShown: (reason: string) => tr('builder.dashboard.widget.notShown', { reason }),
    notFitting: (width: number, height: number) => tr('builder.dashboard.widget.notFitting', { width, height }),
    get variant() {
      return tr('builder.dashboard.widget.variant');
    },
    variants: words('builder.dashboard.widget.variant'),
    get title() {
      return tr('builder.dashboard.widget.title');
    },
    get titleDefault() {
      return tr('builder.dashboard.widget.titleDefault');
    },
    get titleOwn() {
      return tr('builder.dashboard.widget.titleOwn');
    },
    get titleReset() {
      return tr('builder.dashboard.widget.titleReset');
    },
    get titleHint() {
      return tr('builder.dashboard.widget.titleHint');
    },
    get onTap() {
      return tr('builder.dashboard.widget.onTap');
    },
    get onTapNone() {
      return tr('builder.dashboard.widget.onTapNone');
    },
    get settings() {
      return tr('builder.dashboard.widget.settings');
    },
  },

  field: {
    get choose() {
      return tr('builder.dashboard.field.choose');
    },
    get none() {
      return tr('builder.dashboard.field.none');
    },
    get add() {
      return tr('builder.dashboard.field.add');
    },
    missing: (id: string) => tr('builder.dashboard.field.missing', { id }),
    get up() {
      return tr('builder.dashboard.field.up');
    },
    get down() {
      return tr('builder.dashboard.field.down');
    },
    get remove() {
      return tr('builder.dashboard.field.remove');
    },
    atLeast: (n: number) => tr('builder.dashboard.field.atLeast', { count: n }),
  },

  page: {
    get name() {
      return tr('builder.dashboard.page.name');
    },
    get isHome() {
      return tr('builder.dashboard.page.isHome');
    },
    get makeHome() {
      return tr('builder.dashboard.page.makeHome');
    },
    get popupNote() {
      return tr('builder.dashboard.page.popupNote');
    },
    get columns() {
      return tr('builder.dashboard.page.columns');
    },
    get rows() {
      return tr('builder.dashboard.page.rows');
    },
    gridHint: (columns: number, rows: number) => tr('builder.dashboard.page.gridHint', { columns, rows }),
    get moveEarlier() {
      return tr('builder.dashboard.page.moveEarlier');
    },
    get moveLater() {
      return tr('builder.dashboard.page.moveLater');
    },
    get remove() {
      return tr('builder.dashboard.page.remove');
    },
    removeConfirm: (name: string) => tr('builder.dashboard.page.removeConfirm', { name }),
    get homeCannotGo() {
      return tr('builder.dashboard.page.homeCannotGo');
    },
  },

  dashboard: {
    get sidebar() {
      return tr('builder.dashboard.dashboard.sidebar');
    },
    get overflow() {
      return tr('builder.dashboard.dashboard.overflow');
    },
    overflows: words('builder.dashboard.dashboard.overflow'),
    get cannotFit() {
      return tr('builder.dashboard.dashboard.cannotFit');
    },
    get range() {
      return tr('builder.dashboard.dashboard.range');
    },
    get rangeHint() {
      return tr('builder.dashboard.dashboard.rangeHint');
    },
    get smallest() {
      return tr('builder.dashboard.dashboard.smallest');
    },
    get largest() {
      return tr('builder.dashboard.dashboard.largest');
    },
    get width() {
      return tr('builder.dashboard.dashboard.width');
    },
    get height() {
      return tr('builder.dashboard.dashboard.height');
    },
    get idle() {
      return tr('builder.dashboard.dashboard.idle');
    },
    get idleSeconds() {
      return tr('builder.dashboard.dashboard.idleSeconds');
    },
    get back() {
      return tr('builder.dashboard.dashboard.back');
    },
    get theme() {
      return tr('builder.dashboard.dashboard.theme');
    },
    get mode() {
      return tr('builder.dashboard.dashboard.mode');
    },
    modes: words('builder.dashboard.dashboard.mode'),
    themes: words('builder.dashboard.dashboard.theme'),
  },

  navbar: {
    get title() {
      return tr('builder.dashboard.navbar.title');
    },
    get on() {
      return tr('builder.dashboard.navbar.on');
    },
    get edge() {
      return tr('builder.dashboard.navbar.edge');
    },
    edges: words('builder.dashboard.navbar.edge'),
    get tabs() {
      return tr('builder.dashboard.navbar.tabs');
    },
    get items() {
      return tr('builder.dashboard.navbar.items');
    },
    get page() {
      return tr('builder.dashboard.navbar.page');
    },
    get icon() {
      return tr('builder.dashboard.navbar.icon');
    },
    get add() {
      return tr('builder.dashboard.navbar.add');
    },
  },

  /** What each kind is called in the palette; a kind not here is named from its id. */
  kinds: words('builder.dashboard.kind'),

  /** What each setting is called; one not here is named from its key. */
  settingNames: words('builder.dashboard.setting'),
};

/** `room_tile` as "Room tile": a name for a kind or setting nobody wrote one for. */
export const fromId = (id: string) => (id.charAt(0).toUpperCase() + id.slice(1)).replace(/_/g, ' ');
