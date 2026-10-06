/**
 * Every word the Dashboard editor shows (#56), in English, reached as
 * `strings.editor` (`strings.ts`) so that i18n (#59) finds the Builder's
 * text in one tree. Kept in a file of its own only so the editor's strings
 * and the rest of the Builder's are edited without touching each other.
 *
 * The one string here that ends up in the document is `newPageName`, the
 * name a new Page starts with, which the admin may change.
 */
export const editorStrings = {
  edit: 'Edit layout',
  back: 'All Dashboards',
  editing: (name: string) => `Editing “${name}”`,

  pages: {
    label: 'Pages',
    add: 'Add Page',
    home: 'Home',
    popup: (name: string) => `Popup · ${name}`,
  },
  newPageName: (n: number) => `Page ${n}`,

  size: {
    label: 'Preview at',
    smallest: 'Smallest',
    largest: 'Largest',
    dims: (width: number, height: number) => `${width} × ${height}`,
    notFitting: (n: number, width: number, height: number) =>
      n === 1 ? `1 Widget does not fit its box at ${width} × ${height}` : `${n} Widgets do not fit their boxes at ${width} × ${height}`,
    allFit: (width: number, height: number) => `Every Widget fits at ${width} × ${height}`,
    fitRule: 'A Widget does not fit when any of its content is out of sight and would have to be scrolled to.',
  },

  palette: {
    label: 'Add a Widget',
    hint: 'Tap to add in the first free place, or drag onto the preview.',
    full: 'This Page has no free cell. Make room, or enlarge its grid.',
  },

  preview: {
    label: (page: string) => `Preview of ${page}`,
    notShown: 'Not shown',
    notFitting: 'Does not fit',
    refused: 'Overlaps another Widget',
    resize: 'Resize',
    rule: 'Drag a Widget to move it, its corner to resize it. Widgets never overlap; a drop where one would is undone.',
  },

  tabs: { widget: 'Widget', page: 'Page', dashboard: 'Dashboard' },

  widget: {
    none: 'Select a Widget on the preview to change it.',
    delete: 'Delete Widget',
    place: (x: number, y: number, w: number, h: number) => `Column ${x + 1}, row ${y + 1} · ${w} × ${h} cells`,
    noPage: 'choose a Page for it to open',
    notShown: (reason: string) => `Not shown on the Dashboard until this is fixed: ${reason}.`,
    notFitting: (width: number, height: number) =>
      `Some of it is out of sight at ${width} × ${height}. Make it bigger, or choose its compact form.`,
    variant: 'Form',
    variants: { full: 'Full', compact: 'Compact' } as Record<string, string>,
    title: 'Title',
    titleDefault: 'Default title',
    titleOwn: 'Own title',
    titleReset: 'Reset to default',
    titleHint: 'Shown as written. Leave it empty to show no title.',
    onTap: 'On tap, open',
    onTapNone: 'Nothing',
    settings: 'Settings',
  },

  field: {
    choose: 'Choose…',
    none: 'None',
    add: 'Add…',
    missing: (id: string) => `${id} (not in Home Assistant)`,
    up: 'Move up',
    down: 'Move down',
    remove: 'Remove',
    atLeast: (n: number) => (n === 1 ? 'Choose at least one.' : `Choose at least ${n}.`),
  },

  page: {
    name: 'Name',
    isHome: 'This is the Home Page.',
    makeHome: 'Make Home Page',
    popupNote: 'A Popup’s Page is opened by Home Assistant, never by a tap or the Navbar.',
    columns: 'Columns',
    rows: 'Rows',
    gridHint: (columns: number, rows: number) => `Its Widgets need at least ${columns} columns and ${rows} rows.`,
    moveEarlier: 'Move earlier',
    moveLater: 'Move later',
    remove: 'Remove Page',
    removeConfirm: (name: string) => `Remove the Page “${name}” and its Widgets? Widgets and Navbar items that open it stop doing so.`,
    homeCannotGo: 'The Home Page cannot be removed. Make another Page the Home Page first.',
  },

  dashboard: {
    sidebar: 'Show in the sidebar',
    overflow: 'Pages',
    overflows: { fit: 'Fit to the screen', scroll: 'Scroll' } as Record<string, string>,
    cannotFit: 'Some Widgets sit below their Page’s rows. Move them up, or add rows, to fit.',
    range: 'Supported screens',
    rangeHint: 'The Builder previews the smallest and the largest. Outside them the Dashboard still renders.',
    smallest: 'Smallest',
    largest: 'Largest',
    width: 'Width',
    height: 'Height',
    idle: 'Return to the Home Page when idle',
    idleSeconds: 'After (seconds)',
    back: 'Back gesture walks the opened Pages',
    theme: 'Theme',
    mode: 'Mode',
    modes: { light: 'Light', dark: 'Dark', auto: 'Follow the device' } as Record<string, string>,
    themes: { 'casa-panel': 'Casa Panel' } as Record<string, string>,
  },

  navbar: {
    title: 'Navbar',
    on: 'Show a Navbar',
    edge: 'Edge',
    edges: { top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' } as Record<string, string>,
    tabs: 'Tabs: each item keeps its own trail of Pages',
    items: 'Items',
    page: 'Page',
    icon: 'Icon',
    add: 'Add item',
  },

  /** What each kind is called in the palette; a kind not here is named from its id. */
  kinds: {
    clock: 'Clock',
    status_chips: 'Status chips',
    stats: 'Stats',
    camera_wall: 'Camera Wall',
    group: 'Group',
    toggle: 'Light or switch',
    lock: 'Lock or gate',
    alarm: 'Alarm',
    climate: 'Thermostat',
    media: 'Media player',
    vacuum: 'Vacuum',
    weather: 'Weather',
    sensor: 'Sensor',
    binary_sensor: 'Binary sensor',
    select: 'Select',
    room_tile: 'Room Tile',
    room_grid: 'Room Grid',
    link: 'Link',
  } as Record<string, string>,

  /** What each setting is called; one not here is named from its key. */
  settingNames: {
    entity: 'Entity',
    members: 'Members',
    cameras: 'Cameras',
    alarm: 'Alarm',
    power: 'Power sensor',
  } as Record<string, string>,
};

/** `room_tile` as "Room tile": a name for a kind or setting nobody wrote one for. */
export const fromId = (id: string) => (id.charAt(0).toUpperCase() + id.slice(1)).replace(/_/g, ' ');
