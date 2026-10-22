import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Dashboard, Page, Widget } from '../document/types';
import { newDashboard } from './draft';
import {
  addNavbarItem,
  addPage,
  canFit,
  mapDashboard,
  moveNavbarItem,
  movePage,
  ordinaryPages,
  removeNavbarItem,
  removePage,
  renamePage,
  setGrid,
  setHomePage,
  setNavbar,
  setNavbarFields,
  setHouseEntity,
  setMode,
  setRangeEnd,
  setSettings,
  updateNavbarItem,
} from './pages';

const widget = (id: string, x: number, y: number, w = 1, h = 1, on_tap: string | null = null): Widget => ({
  id,
  kind: 'clock',
  x,
  y,
  w,
  h,
  variant: 'full',
  title: null,
  on_tap,
  settings: {},
});

const page = (id: string, widgets: Widget[] = [], popup: string | null = null): Page => ({
  id,
  name: id,
  popup,
  grid: { columns: 12, rows: 8 },
  widgets,
});

/** Home, Climate and a Popup's Page; a Widget on Home opens Climate; the Navbar has both. */
function wall(): Dashboard {
  return {
    ...newDashboard({ name: 'Wall', slug: 'wall' }, 'Home', () => 'x'),
    id: 'wall',
    home_page: 'home',
    navbar: {
      edge: 'bottom',
      tabs: false,
      items: [
        { id: 'n1', page: 'home', icon: 'mdi:home' },
        { id: 'n2', page: 'climate', icon: 'mdi:thermometer' },
      ],
    },
    pages: [page('home', [widget('w1', 0, 0, 2, 2, 'climate')]), page('climate', [widget('w2', 0, 0, 6, 6)]), page('ring', [], 'ring')],
  };
}

test('a Page is added empty, after the last, with the given grid', () => {
  const d = addPage(wall(), { id: 'cams', name: ' Cameras ', grid: { columns: 6, rows: 4 } });
  assert.deepEqual(d.pages.at(-1), { id: 'cams', name: 'Cameras', popup: null, grid: { columns: 6, rows: 4 }, widgets: [] });
});

test('a Page is renamed, never to blank', () => {
  assert.equal(renamePage(wall(), 'climate', ' Clima ').pages[1].name, 'Clima');
  const d = wall();
  assert.equal(renamePage(d, 'climate', '  '), d);
});

test('removing a Page removes every way to it', () => {
  const d = removePage(wall(), 'climate');
  assert.deepEqual(
    d.pages.map(p => p.id),
    ['home', 'ring']
  );
  assert.equal(d.pages[0].widgets[0].on_tap, null);
  assert.deepEqual(
    d.navbar?.items.map(i => i.id),
    ['n1']
  );
});

test("removing a Page clears every Member's tap to it, and keeps the rest", () => {
  const member = (entity: string, on_tap: string | null) => ({ entity, name: null, variant: null, on_tap });
  const group: Widget = {
    ...widget('g', 2, 0, 2, 2),
    kind: 'group',
    settings: { members: [member('light.a', 'climate'), member('light.b', 'home'), 'light.c'] },
  };
  const d = wall();
  d.pages[0].widgets.push(group);
  assert.deepEqual(removePage(d, 'climate').pages[0].widgets[1].settings.members, [
    member('light.a', null),
    member('light.b', 'home'),
    'light.c',
  ]);
});

test('the Home Page and the last Page cannot be removed', () => {
  const d = wall();
  assert.equal(removePage(d, 'home'), d);
  const one = { ...d, pages: [d.pages[0]] };
  assert.equal(removePage(one, 'home'), one);
});

test('a Page moves one place at a time, within the list', () => {
  assert.deepEqual(
    movePage(wall(), 'climate', -1).pages.map(p => p.id),
    ['climate', 'home', 'ring']
  );
  const d = wall();
  assert.equal(movePage(d, 'home', -1), d);
});

test("the Home Page is any ordinary Page, never a Popup's", () => {
  assert.equal(setHomePage(wall(), 'climate').home_page, 'climate');
  const d = wall();
  assert.equal(setHomePage(d, 'ring'), d);
  assert.deepEqual(
    ordinaryPages(d).map(p => p.id),
    ['home', 'climate']
  );
});

test('a grid shrinks only as far as its Widgets reach, and only up to 96', () => {
  const d = wall();
  assert.deepEqual(setGrid(d, 'climate', { columns: 6, rows: 6 }).pages[1].grid, { columns: 6, rows: 6 });
  assert.equal(setGrid(d, 'climate', { columns: 5, rows: 6 }), d);
  assert.equal(setGrid(d, 'climate', { columns: 6, rows: 5 }), d);
  assert.equal(setGrid(d, 'climate', { columns: 97, rows: 8 }), d);
  assert.equal(setGrid(d, 'climate', { columns: 6.5, rows: 8 }), d);
  // A scrolling Page may have Widgets below its rows.
  const scrolling = setSettings(d, { overflow: 'scroll' });
  assert.deepEqual(setGrid(scrolling, 'climate', { columns: 12, rows: 2 }).pages[1].grid, { columns: 12, rows: 2 });
});

test('a Dashboard fits only when every Widget is within its rows', () => {
  const scrolling = setSettings(wall(), { overflow: 'scroll' });
  const short = setGrid(scrolling, 'climate', { columns: 12, rows: 2 });
  assert.equal(canFit(short), false);
  assert.equal(setSettings(short, { overflow: 'fit' }), short);
  assert.equal(canFit(scrolling), true);
  assert.equal(setSettings(scrolling, { overflow: 'fit' }).settings.overflow, 'fit');
});

test('settings refuse an idle return under a second and a range turned inside out', () => {
  const d = wall();
  assert.equal(setSettings(d, { idle_return: 120 }).settings.idle_return, 120);
  assert.equal(setSettings(d, { idle_return: null }).settings.idle_return, null);
  assert.equal(setSettings(d, { idle_return: 0 }), d);
  assert.equal(setSettings(d, { supported_range: { min: { width: 1300, height: 800 }, max: { width: 1280, height: 800 } } }), d);
  assert.equal(setSettings(d, { back_history: false }).settings.back_history, false);
  assert.deepEqual(setSettings(d, { theme: { name: 'casa-panel', mode: 'follow-device' } }).settings.theme, {
    name: 'casa-panel',
    mode: 'follow-device',
  });
});

test('settings refuse a house entity missing under follow-house, outside its Domains, or under any other Mode', () => {
  const d = wall();
  assert.equal(setSettings(d, { theme: { name: 'casa-panel', mode: 'follow-house' } }), d);
  assert.equal(setSettings(d, { theme: { name: 'casa-panel', mode: 'follow-house', entity: 'sensor.lux' } }), d);
  assert.equal(setSettings(d, { theme: { name: 'casa-panel', mode: 'dark', entity: 'sun.sun' } }), d);
  const ok = { name: 'casa-panel', mode: 'follow-house' as const, entity: 'input_boolean.night' };
  assert.deepEqual(setSettings(d, { theme: ok }).settings.theme, ok);
});

test('choosing follow-house reads the sun until the admin picks another entity', () => {
  const d = setMode(wall(), 'follow-house');
  assert.deepEqual(d.settings.theme, { name: 'casa-panel', mode: 'follow-house', entity: 'sun.sun' });
});

test('the house entity can be any sun, binary sensor or boolean, and nothing else', () => {
  const d = setMode(wall(), 'follow-house');
  assert.equal(setHouseEntity(d, 'binary_sensor.dark_outside').settings.theme.entity, 'binary_sensor.dark_outside');
  assert.equal(setHouseEntity(d, 'input_boolean.night').settings.theme.entity, 'input_boolean.night');
  assert.equal(setHouseEntity(d, 'sensor.lux'), d);
  assert.equal(setHouseEntity(d, 'light.kitchen'), d);
  // Only under follow-house.
  const dark = wall();
  assert.equal(setHouseEntity(dark, 'sun.sun'), dark);
});

test('choosing follow-house again keeps the entity picked; any other Mode removes it', () => {
  const d = setHouseEntity(setMode(wall(), 'follow-house'), 'binary_sensor.dark_outside');
  assert.equal(setMode(d, 'follow-house').settings.theme.entity, 'binary_sensor.dark_outside');
  for (const mode of ['light', 'dark', 'follow-device'] as const) {
    const theme = setMode(d, mode).settings.theme;
    assert.deepEqual(theme, { name: 'casa-panel', mode });
    assert.ok(!('entity' in theme));
  }
});

test('one end of the range set past the other carries it along', () => {
  const d = setRangeEnd(wall(), 'min', { width: 1400, height: 600 });
  assert.deepEqual(d.settings.supported_range, { min: { width: 1400, height: 600 }, max: { width: 1400, height: 800 } });
  const e = setRangeEnd(d, 'max', { width: 1000, height: 500 });
  assert.deepEqual(e.settings.supported_range, { min: { width: 1000, height: 500 }, max: { width: 1000, height: 500 } });
  assert.equal(setRangeEnd(d, 'max', { width: 0, height: 500 }), d);
});

test('a Navbar is added with the Home Page, and removed whole', () => {
  const none = { ...wall(), navbar: null };
  const d = setNavbar(none, true, 'n0');
  assert.deepEqual(d.navbar, { edge: 'bottom', tabs: false, items: [{ id: 'n0', page: 'home', icon: 'mdi:home' }] });
  assert.equal(setNavbar(d, false, 'x').navbar, null);
  assert.deepEqual(setNavbarFields(d, { edge: 'left', tabs: true }).navbar, { ...d.navbar!, edge: 'left', tabs: true });
});

test('Navbar items open ordinary Pages only, and move and go one at a time', () => {
  const d = wall();
  assert.equal(addNavbarItem(d, { id: 'n3', page: 'ring', icon: 'mdi:bell' }), d);
  assert.equal(addNavbarItem(d, { id: 'n3', page: 'climate', icon: 'mdi:fan' }).navbar?.items.length, 3);
  assert.equal(updateNavbarItem(d, 'n2', { page: 'ring' }), d);
  assert.equal(updateNavbarItem(d, 'n2', { icon: 'mdi:fan' }).navbar?.items[1].icon, 'mdi:fan');
  assert.deepEqual(
    moveNavbarItem(d, 'n2', -1).navbar?.items.map(i => i.id),
    ['n2', 'n1']
  );
  assert.deepEqual(
    removeNavbarItem(d, 'n1').navbar?.items.map(i => i.id),
    ['n2']
  );
});

test('one Dashboard of the document is changed, the others kept', () => {
  const other = { ...wall(), id: 'phone' };
  const doc = { dashboards: [wall(), other] };
  const next = mapDashboard(doc, 'wall', d => renamePage(d, 'home', 'Casa'));
  assert.equal(next.dashboards[0].pages[0].name, 'Casa');
  assert.equal(next.dashboards[1], other);
});

test("removing a Page clears every Room Grid Member's tap to it", () => {
  const grid: Widget = {
    ...widget('r', 2, 0, 2, 2),
    kind: 'room_grid',
    settings: { areas: [{ area: 'salone', on_tap: 'climate' }, { area: 'cucina', on_tap: 'home' }, 'bagno'] },
  };
  const d = wall();
  d.pages[0].widgets.push(grid);
  assert.deepEqual(removePage(d, 'climate').pages[0].widgets[1].settings.areas, [
    { area: 'salone', on_tap: null },
    { area: 'cucina', on_tap: 'home' },
    'bagno',
  ]);
});
