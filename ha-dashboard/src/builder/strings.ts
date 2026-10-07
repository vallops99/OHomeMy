/**
 * Every word the Builder shows, in one place: the catalogues' `builder.*`
 * keys (`src/i18n/messages/`, #59), in the viewer's language, as the
 * Builder's components read them. Nothing else in `src/builder/` writes
 * user-facing text.
 *
 * Each word is a getter, or a function where it takes values, so it is read
 * in the language of the moment it is shown, not of the moment this module
 * loaded. The shape is the one the components were written against, which
 * keeps the values each message takes checked at every call.
 *
 * Text an admin writes (a Dashboard's name) is never translated; the one
 * string here that ends up in the document is `homePageName`, the name a new
 * Dashboard's first Page starts with, in the admin's language, which the
 * admin may change.
 */
import { fmt, tr } from '../i18n';
import { editorStrings } from './editorStrings';
import type { SlugProblem } from './slug';

/** " This discards your Draft." after a question, when there is one to discard. */
const discards = (dirty: boolean) => (dirty ? ` ${tr('builder.discardsDraft')}` : '');

export const strings = {
  get title() {
    return tr('builder.title');
  },
  get menu() {
    return tr('builder.menu');
  },
  get loading() {
    return tr('builder.loading');
  },

  status: {
    clean: (revision: number) => (revision === 0 ? tr('builder.status.none') : tr('builder.status.clean', { revision })),
    dirty: (revision: number) => tr('builder.status.dirty', { revision }),
    get publishing() {
      return tr('builder.status.publishing');
    },
    get conflict() {
      return tr('builder.status.conflict');
    },
  },
  get publish() {
    return tr('builder.publish');
  },
  get discard() {
    return tr('builder.discard');
  },
  get discardConfirm() {
    return tr('builder.discardConfirm');
  },
  published: (revision: number) => tr('builder.published', { revision }),
  failed: (message: string) => tr('builder.failed', { message }),
  get dismiss() {
    return tr('builder.dismiss');
  },

  conflict: {
    get title() {
      return tr('builder.conflict.title');
    },
    body: (revision: number) => tr('builder.conflict.body', { revision }),
    get reload() {
      return tr('builder.conflict.reload');
    },
    get reloadNote() {
      return tr('builder.conflict.reloadNote');
    },
  },

  dashboards: {
    get title() {
      return tr('builder.dashboards.title');
    },
    get none() {
      return tr('builder.dashboards.none');
    },
    get create() {
      return tr('builder.dashboards.create');
    },
    pages: (n: number) => tr('builder.dashboards.pages', { count: n }),
    get hidden() {
      return tr('builder.dashboards.hidden');
    },
    get new() {
      return tr('builder.dashboards.new');
    },
    get changed() {
      return tr('builder.dashboards.changed');
    },
    deleted: (names: string[]) => tr('builder.dashboards.deleted', { names: fmt.list(names) }),
    get open() {
      return tr('builder.dashboards.open');
    },
    get rename() {
      return tr('builder.dashboards.rename');
    },
    get duplicate() {
      return tr('builder.dashboards.duplicate');
    },
    get delete() {
      return tr('builder.dashboards.delete');
    },
    deleteConfirm: (name: string) => tr('builder.dashboards.deleteConfirm', { name }),
    copyName: (name: string) => tr('builder.dashboards.copyName', { name }),
  },

  form: {
    get createTitle() {
      return tr('builder.form.createTitle');
    },
    duplicateTitle: (name: string) => tr('builder.form.duplicateTitle', { name }),
    get renameTitle() {
      return tr('builder.form.renameTitle');
    },
    get name() {
      return tr('builder.form.name');
    },
    get slug() {
      return tr('builder.form.slug');
    },
    get slugHint() {
      return tr('builder.form.slugHint');
    },
    /** An address, not a word: the same in every language. */
    url: (slug: string) => `/ohomemy-${slug}`,
    get create() {
      return tr('builder.form.create');
    },
    get save() {
      return tr('builder.form.save');
    },
    get cancel() {
      return tr('builder.form.cancel');
    },
    get nameEmpty() {
      return tr('builder.form.nameEmpty');
    },
    get slug_problem(): Record<SlugProblem, string> {
      return {
        empty: tr('builder.form.slug.empty'),
        format: tr('builder.form.slug.format'),
        too_long: tr('builder.form.slug.too_long'),
        taken: tr('builder.form.slug.taken'),
      };
    },
  },

  get homePageName() {
    return tr('builder.homePageName');
  },

  history: {
    get title() {
      return tr('builder.history.title');
    },
    get none() {
      return tr('builder.history.none');
    },
    get loading() {
      return tr('builder.history.loading');
    },
    failed: (message: string) => tr('builder.history.failed', { message }),
    revision: (revision: number) => tr('builder.history.revision', { revision }),
    get empty() {
      return tr('builder.history.empty');
    },
    get current() {
      return tr('builder.history.current');
    },
    dashboards: (n: number) => tr('builder.history.dashboards', { count: n }),
    undo: (revision: number) => tr('builder.history.undo', { revision }),
    get restore() {
      return tr('builder.history.restore');
    },
    restoreConfirm: (revision: number, dirty: boolean) => tr('builder.history.restoreConfirm', { revision }) + discards(dirty),
  },

  transfer: {
    get title() {
      return tr('builder.transfer.title');
    },
    get body() {
      return tr('builder.transfer.body');
    },
    get export() {
      return tr('builder.transfer.export');
    },
    get import() {
      return tr('builder.transfer.import');
    },
    importConfirm: (file: string, dirty: boolean) => tr('builder.transfer.importConfirm', { file }) + discards(dirty),
    notJson: (file: string) => tr('builder.transfer.notJson', { file }),
    exportFailed: (message: string) => tr('builder.transfer.exportFailed', { message }),
  },

  /** The Dashboard editor's (#56), kept in `editorStrings.ts`. */
  editor: editorStrings,

  defaults: {
    get title() {
      return tr('builder.defaults.title');
    },
    get body() {
      return tr('builder.defaults.body');
    },
    get loading() {
      return tr('builder.defaults.loading');
    },
    failed: (message: string) => tr('builder.defaults.failed', { message }),
    setFailed: (name: string, message: string) => tr('builder.defaults.setFailed', { name, message }),
    get system() {
      return tr('builder.defaults.system');
    },
    get systemMeta() {
      return tr('builder.defaults.systemMeta');
    },
    get systemName() {
      return tr('builder.defaults.systemName');
    },
    get admin() {
      return tr('builder.defaults.admin');
    },
    get inactive() {
      return tr('builder.defaults.inactive');
    },
    choose: (name: string) => tr('builder.defaults.choose', { name }),
    get haDefault() {
      return tr('builder.defaults.haDefault');
    },
    other: (urlPath: string) => tr('builder.defaults.other', { urlPath }),
    publishFirst: (name: string) => tr('builder.defaults.publishFirst', { name }),
    get lostTitle() {
      return tr('builder.defaults.lostTitle');
    },
    /** Where they land: the surviving system default, or else Home Assistant's. */
    lost: (name: string, who: string[], fallback: 'system' | 'home-assistant') =>
      tr(fallback === 'system' ? 'builder.defaults.lostToSystem' : 'builder.defaults.lost', { name, who: fmt.list(who) }),
  },

  get confirm() {
    return tr('builder.confirm');
  },
  get cancel() {
    return tr('builder.cancel');
  },

  /** A moment, `07/10/2026, 09:04`, in the viewer's date and time formats. */
  time: (iso: string) => fmt.dateTime(new Date(iso)),
};
