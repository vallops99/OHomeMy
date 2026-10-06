/**
 * Every word the Builder shows, in English, in one place so that i18n (#59)
 * can lift it whole. Nothing else in `src/builder/` writes user-facing text.
 *
 * Text an admin writes (a Dashboard's name) is never translated; the one
 * string here that ends up in the document is `homePageName`, the name a new
 * Dashboard's first Page starts with, which the admin may change.
 */
import type { SlugProblem } from './slug';

export const strings = {
  title: 'OHomeMy Builder',
  menu: 'Menu',
  loading: 'Connecting to Home Assistant…',

  status: {
    clean: (revision: number) => (revision === 0 ? 'Nothing published yet' : `Published · revision ${revision}`),
    dirty: (revision: number) => `Draft · unpublished changes over revision ${revision}`,
    publishing: 'Publishing…',
    conflict: 'Draft cannot be published',
  },
  publish: 'Publish',
  discard: 'Discard Draft',
  discardConfirm: 'Discard every change in your Draft?',
  published: (revision: number) => `Published as revision ${revision}. Every open Dashboard shows it now.`,
  failed: (message: string) => `Not published: ${message}`,
  dismiss: 'Dismiss',

  conflict: {
    title: 'Someone else published',
    body: (revision: number) =>
      `Revision ${revision} was published from another Builder while you were working. ` +
      'Your Draft was not published, and it cannot be over their changes.',
    reload: 'Reload their version',
    reloadNote: 'Reloading discards your Draft.',
  },

  dashboards: {
    title: 'Dashboards',
    none: 'No Dashboards yet. Create the first one, then Publish.',
    create: 'New Dashboard',
    pages: (n: number) => (n === 1 ? '1 Page' : `${n} Pages`),
    hidden: 'Hidden from the sidebar',
    new: 'New',
    changed: 'Changed',
    deleted: (names: string[]) => `Deleted in this Draft: ${names.join(', ')}`,
    open: 'Open',
    rename: 'Rename',
    duplicate: 'Duplicate',
    delete: 'Delete',
    deleteConfirm: (name: string) => `Delete “${name}”? It disappears for everyone when you Publish.`,
    copyName: (name: string) => `${name} (copy)`,
  },

  form: {
    createTitle: 'New Dashboard',
    duplicateTitle: (name: string) => `Duplicate “${name}”`,
    renameTitle: 'Rename',
    name: 'Name',
    slug: 'Address',
    slugHint: 'Fixed once the Dashboard is created. A rename keeps it.',
    url: (slug: string) => `/ohomemy-${slug}`,
    create: 'Create',
    save: 'Save',
    cancel: 'Cancel',
    nameEmpty: 'Give it a name.',
    slug_problem: {
      empty: 'Choose an address.',
      format: 'Lowercase letters and digits, joined by single hyphens.',
      too_long: 'At most 40 characters.',
      taken: 'Another Dashboard already has this address.',
    } satisfies Record<SlugProblem, string>,
  },

  homePageName: 'Home',

  history: {
    title: 'History',
    none: 'Nothing has been published yet.',
    loading: 'Loading history…',
    failed: (message: string) => `History could not be loaded: ${message}`,
    revision: (revision: number) => `Revision ${revision}`,
    empty: 'No Dashboards',
    current: 'Current',
    dashboards: (n: number) => (n === 1 ? '1 Dashboard' : `${n} Dashboards`),
    undo: (revision: number) => `Undo revision ${revision}`,
    restore: 'Restore',
    restoreConfirm: (revision: number, dirty: boolean) =>
      `Publish revision ${revision} again, as a new revision?${dirty ? ' This discards your Draft.' : ''}`,
  },

  transfer: {
    title: 'Export and import',
    body: 'Export saves what is published as a file. Import publishes a file in its place.',
    export: 'Export',
    import: 'Import…',
    importConfirm: (file: string, dirty: boolean) =>
      `Publish “${file}” in place of every Dashboard?${dirty ? ' This discards your Draft.' : ''}`,
    notJson: (file: string) => `“${file}” is not a JSON file.`,
    exportFailed: (message: string) => `Export failed: ${message}`,
  },

  confirm: 'Confirm',
  cancel: 'Cancel',

  time: (iso: string) => new Date(iso).toLocaleString(),
};
