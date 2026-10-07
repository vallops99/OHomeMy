/**
 * Every word the Dashboard editor shows (#56): the catalogues' `editor.*`
 * keys (#59), reached as `strings.editor` (`strings.ts`) and shaped as the
 * editor's components read them. Getters and functions, as there, so each
 * word is the viewer's language at the moment it is shown.
 *
 * The one string here that ends up in the document is `newPageName`, the
 * name a new Page starts with, which the admin may change.
 */
import { isKey, tr, trKey } from '../i18n';

/**
 * The words under `prefix`, by the last part of their key (`kinds.clock`
 * from `editor.kind.clock`), for a name looked up from data: a kind, a
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

export const editorStrings = {
  get edit() {
    return tr('editor.edit');
  },
  get back() {
    return tr('editor.back');
  },
  editing: (name: string) => tr('editor.editing', { name }),

  pages: {
    get label() {
      return tr('editor.pages.label');
    },
    get add() {
      return tr('editor.pages.add');
    },
    get home() {
      return tr('editor.pages.home');
    },
    popup: (name: string) => tr('editor.pages.popup', { name }),
  },

  newPageName: (n: number) => tr('editor.newPageName', { n }),

  size: {
    get label() {
      return tr('editor.size.label');
    },
    get smallest() {
      return tr('editor.size.smallest');
    },
    get largest() {
      return tr('editor.size.largest');
    },
    dims: (width: number, height: number) => tr('editor.size.dims', { width, height }),
    notFitting: (n: number, width: number, height: number) => tr('editor.size.notFitting', { count: n, width, height }),
    allFit: (width: number, height: number) => tr('editor.size.allFit', { width, height }),
    get fitRule() {
      return tr('editor.size.fitRule');
    },
  },

  palette: {
    get label() {
      return tr('editor.palette.label');
    },
    get hint() {
      return tr('editor.palette.hint');
    },
    get full() {
      return tr('editor.palette.full');
    },
  },

  preview: {
    label: (page: string) => tr('editor.preview.label', { page }),
    get notShown() {
      return tr('editor.preview.notShown');
    },
    get notFitting() {
      return tr('editor.preview.notFitting');
    },
    get refused() {
      return tr('editor.preview.refused');
    },
    get resize() {
      return tr('editor.preview.resize');
    },
    get rule() {
      return tr('editor.preview.rule');
    },
  },

  tabs: {
    get widget() {
      return tr('editor.tabs.widget');
    },
    get page() {
      return tr('editor.tabs.page');
    },
    get dashboard() {
      return tr('editor.tabs.dashboard');
    },
  },

  widget: {
    get none() {
      return tr('editor.widget.none');
    },
    get delete() {
      return tr('editor.widget.delete');
    },
    place: (x: number, y: number, w: number, h: number) => tr('editor.widget.place', { column: x + 1, row: y + 1, w, h }),
    get noPage() {
      return tr('editor.widget.noPage');
    },
    notShown: (reason: string) => tr('editor.widget.notShown', { reason }),
    notFitting: (width: number, height: number) => tr('editor.widget.notFitting', { width, height }),
    get variant() {
      return tr('editor.widget.variant');
    },
    variants: words('editor.widget.variant'),
    get title() {
      return tr('editor.widget.title');
    },
    get titleDefault() {
      return tr('editor.widget.titleDefault');
    },
    get titleOwn() {
      return tr('editor.widget.titleOwn');
    },
    get titleReset() {
      return tr('editor.widget.titleReset');
    },
    get titleHint() {
      return tr('editor.widget.titleHint');
    },
    get onTap() {
      return tr('editor.widget.onTap');
    },
    get onTapNone() {
      return tr('editor.widget.onTapNone');
    },
    get settings() {
      return tr('editor.widget.settings');
    },
  },

  field: {
    get choose() {
      return tr('editor.field.choose');
    },
    get none() {
      return tr('editor.field.none');
    },
    get add() {
      return tr('editor.field.add');
    },
    missing: (id: string) => tr('editor.field.missing', { id }),
    get up() {
      return tr('editor.field.up');
    },
    get down() {
      return tr('editor.field.down');
    },
    get remove() {
      return tr('editor.field.remove');
    },
    atLeast: (n: number) => tr('editor.field.atLeast', { count: n }),
  },

  page: {
    get name() {
      return tr('editor.page.name');
    },
    get isHome() {
      return tr('editor.page.isHome');
    },
    get makeHome() {
      return tr('editor.page.makeHome');
    },
    get popupNote() {
      return tr('editor.page.popupNote');
    },
    get columns() {
      return tr('editor.page.columns');
    },
    get rows() {
      return tr('editor.page.rows');
    },
    gridHint: (columns: number, rows: number) => tr('editor.page.gridHint', { columns, rows }),
    get moveEarlier() {
      return tr('editor.page.moveEarlier');
    },
    get moveLater() {
      return tr('editor.page.moveLater');
    },
    get remove() {
      return tr('editor.page.remove');
    },
    removeConfirm: (name: string) => tr('editor.page.removeConfirm', { name }),
    get homeCannotGo() {
      return tr('editor.page.homeCannotGo');
    },
  },

  dashboard: {
    get sidebar() {
      return tr('editor.dashboard.sidebar');
    },
    get overflow() {
      return tr('editor.dashboard.overflow');
    },
    overflows: words('editor.dashboard.overflow'),
    get cannotFit() {
      return tr('editor.dashboard.cannotFit');
    },
    get range() {
      return tr('editor.dashboard.range');
    },
    get rangeHint() {
      return tr('editor.dashboard.rangeHint');
    },
    get smallest() {
      return tr('editor.dashboard.smallest');
    },
    get largest() {
      return tr('editor.dashboard.largest');
    },
    get width() {
      return tr('editor.dashboard.width');
    },
    get height() {
      return tr('editor.dashboard.height');
    },
    get idle() {
      return tr('editor.dashboard.idle');
    },
    get idleSeconds() {
      return tr('editor.dashboard.idleSeconds');
    },
    get back() {
      return tr('editor.dashboard.back');
    },
    get theme() {
      return tr('editor.dashboard.theme');
    },
    get mode() {
      return tr('editor.dashboard.mode');
    },
    modes: words('editor.dashboard.mode'),
    themes: words('editor.dashboard.theme'),
  },

  navbar: {
    get title() {
      return tr('editor.navbar.title');
    },
    get on() {
      return tr('editor.navbar.on');
    },
    get edge() {
      return tr('editor.navbar.edge');
    },
    edges: words('editor.navbar.edge'),
    get tabs() {
      return tr('editor.navbar.tabs');
    },
    get items() {
      return tr('editor.navbar.items');
    },
    get page() {
      return tr('editor.navbar.page');
    },
    get icon() {
      return tr('editor.navbar.icon');
    },
    get add() {
      return tr('editor.navbar.add');
    },
  },

  /** What each kind is called in the palette; a kind not here is named from its id. */
  kinds: words('editor.kind'),

  /** What each setting is called; one not here is named from its key. */
  settingNames: words('editor.setting'),
};

/** `room_tile` as "Room tile": a name for a kind or setting nobody wrote one for. */
export const fromId = (id: string) => (id.charAt(0).toUpperCase() + id.slice(1)).replace(/_/g, ' ');
