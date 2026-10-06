/**
 * Which Page of a Dashboard is on screen, and how a tap changes it (#54).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Dashboard, Navbar, Page } from '../document/types';
import { atRest, back, canGoBack, currentPage, initialNav, navbarItems, open, reconcile, selectItem, type Nav } from './navigation';

const page = (id: string, popup: string | null = null): Page => ({
  id,
  name: `Page ${id}`,
  popup,
  grid: { columns: 12, rows: 8 },
  widgets: [],
});

const dashboard = (navbar: Navbar | null, home = 'home'): Dashboard => ({
  id: 'd',
  slug: 'd',
  name: 'd',
  show_in_sidebar: true,
  home_page: home,
  settings: {
    overflow: 'fit',
    supported_range: { min: { width: 360, height: 640 }, max: { width: 430, height: 932 } },
    idle_return: null,
    back_history: true,
    theme: { name: 'casa-panel', mode: 'dark' },
  },
  navbar,
  pages: [page('home'), page('rooms'), page('kitchen'), page('cameras'), page('ring', 'ring')],
});

const items = [
  { id: 'i-home', page: 'home', icon: 'mdi:home' },
  { id: 'i-rooms', page: 'rooms', icon: 'mdi:sofa' },
  { id: 'i-cams', page: 'cameras', icon: 'mdi:cctv' },
];
const flat = dashboard({ edge: 'left', tabs: false, items });
const tabs = dashboard({ edge: 'bottom', tabs: true, items });
const bare = dashboard(null);

const run = (d: Dashboard, ...steps: ((nav: Nav) => Nav)[]) => steps.reduce((nav, step) => step(nav), initialNav(d));

test('a Dashboard opens on its Home Page, at rest, with nothing to go back to', () => {
  for (const d of [flat, tabs, bare]) {
    const nav = initialNav(d);
    assert.equal(currentPage(nav, d), 'home');
    assert.equal(atRest(nav, d), true);
    assert.equal(canGoBack(nav, d), false);
  }
});

test('opening Pages leaves a trail the back gesture walks, and back at home does nothing', () => {
  const nav = run(
    bare,
    n => open(n, bare, 'rooms'),
    n => open(n, bare, 'kitchen')
  );
  assert.equal(currentPage(nav, bare), 'kitchen');
  const once = back(nav, bare);
  assert.equal(currentPage(once, bare), 'rooms');
  const twice = back(once, bare);
  assert.equal(currentPage(twice, bare), 'home');
  assert.equal(atRest(twice, bare), true);
  assert.equal(back(twice, bare), twice);
});

test('opening the Page on screen changes nothing; opening home or a Page already in the trail goes back to it', () => {
  const deep = run(
    bare,
    n => open(n, bare, 'rooms'),
    n => open(n, bare, 'kitchen')
  );
  assert.equal(open(deep, bare, 'kitchen'), deep);
  assert.equal(currentPage(open(deep, bare, 'rooms'), bare), 'rooms');
  assert.equal(canGoBack(open(deep, bare, 'rooms'), bare), true);
  const home = open(deep, bare, 'home');
  assert.equal(atRest(home, bare), true);
});

test('a Popup Page or a Page that is not there is never opened', () => {
  const nav = initialNav(bare);
  assert.equal(open(nav, bare, 'ring'), nav);
  assert.equal(open(nav, bare, 'nowhere'), nav);
});

test('the trail is capped, dropping its oldest Pages', () => {
  const many = { ...bare, pages: [page('home'), ...Array.from({ length: 40 }, (_, i) => page(`p${i}`))] };
  const nav = Array.from({ length: 40 }, (_, i) => `p${i}`).reduce((n, id) => open(n, many, id), initialNav(many));
  assert.equal(currentPage(nav, many), 'p39');
  let n = nav;
  let steps = 0;
  while (canGoBack(n, many)) {
    n = back(n, many);
    steps++;
  }
  assert.ok(steps < 40 && steps >= 16, `walked back ${steps}`);
});

test('without Tabs, a Navbar item opens its Page like any tap, and marks the item showing it', () => {
  const nav = selectItem(initialNav(flat), flat, 'i-rooms');
  assert.equal(currentPage(nav, flat), 'rooms');
  assert.equal(canGoBack(nav, flat), true);
  assert.deepEqual(
    navbarItems(nav, flat).map(i => [i.id, i.current, i.pageOpen]),
    [
      ['i-home', false, false],
      ['i-rooms', true, false],
      ['i-cams', false, false],
    ]
  );
  const deeper = open(nav, flat, 'kitchen');
  assert.deepEqual(
    navbarItems(deeper, flat).map(i => i.current),
    [false, false, false]
  );
});

test('Navbar items are labelled with their Page names', () => {
  assert.deepEqual(
    navbarItems(initialNav(flat), flat).map(i => i.name),
    ['Page home', 'Page rooms', 'Page cameras']
  );
});

test('in Tabs mode each item keeps its own trail, and switching keeps each where it was', () => {
  let nav = initialNav(tabs);
  assert.deepEqual(
    navbarItems(nav, tabs).map(i => i.current),
    [true, false, false]
  );
  nav = selectItem(nav, tabs, 'i-rooms');
  assert.equal(currentPage(nav, tabs), 'rooms');
  assert.equal(canGoBack(nav, tabs), false, 'an item’s own Page is its root');
  nav = open(nav, tabs, 'kitchen');
  nav = selectItem(nav, tabs, 'i-cams');
  assert.equal(currentPage(nav, tabs), 'cameras');
  assert.deepEqual(
    navbarItems(nav, tabs).map(i => [i.current, i.pageOpen]),
    [
      [false, false],
      [false, true],
      [true, false],
    ]
  );
  nav = selectItem(nav, tabs, 'i-rooms');
  assert.equal(currentPage(nav, tabs), 'kitchen');
  assert.equal(currentPage(back(nav, tabs), tabs), 'rooms');
});

test('in Tabs mode, tapping the current item takes it back to its own Page', () => {
  const nav = run(
    tabs,
    n => selectItem(n, tabs, 'i-rooms'),
    n => open(n, tabs, 'kitchen'),
    n => selectItem(n, tabs, 'i-rooms')
  );
  assert.equal(currentPage(nav, tabs), 'rooms');
  assert.equal(canGoBack(nav, tabs), false);
});

test('in Tabs mode a Page opens inside the current item, even one that is another item’s', () => {
  const nav = open(initialNav(tabs), tabs, 'cameras');
  assert.equal(currentPage(nav, tabs), 'cameras');
  assert.deepEqual(
    navbarItems(nav, tabs).map(i => i.current),
    [true, false, false]
  );
  assert.equal(currentPage(back(nav, tabs), tabs), 'home');
});

test('in Tabs mode with no item for the Home Page, the Home Page has a trail of its own', () => {
  const d = dashboard({ edge: 'bottom', tabs: true, items: items.slice(1) });
  let nav = initialNav(d);
  assert.deepEqual(
    navbarItems(nav, d).map(i => i.current),
    [false, false]
  );
  nav = open(nav, d, 'kitchen');
  nav = selectItem(nav, d, 'i-rooms');
  assert.equal(atRest(nav, d), false);
  assert.equal(atRest(initialNav(d), d), true);
});

test('away from rest means another item, or any trail left open', () => {
  assert.equal(atRest(selectItem(initialNav(tabs), tabs, 'i-cams'), tabs), false);
  const left = run(
    tabs,
    n => selectItem(n, tabs, 'i-rooms'),
    n => open(n, tabs, 'kitchen'),
    n => selectItem(n, tabs, 'i-home')
  );
  assert.equal(currentPage(left, tabs), 'home');
  assert.equal(atRest(left, tabs), false);
});

test('after a Publish, Pages and items that are gone are forgotten', () => {
  let nav = run(
    tabs,
    n => selectItem(n, tabs, 'i-rooms'),
    n => open(n, tabs, 'kitchen')
  );
  const without = { ...tabs, pages: tabs.pages.filter(p => p.id !== 'kitchen') };
  assert.equal(currentPage(reconcile(nav, without), without), 'rooms');
  const noItem = { ...tabs, navbar: { ...tabs.navbar!, items: items.filter(i => i.id !== 'i-rooms') } };
  assert.equal(currentPage(reconcile(nav, noItem), noItem), 'home');
  const noTabs = { ...tabs, navbar: null };
  nav = reconcile(nav, noTabs);
  assert.equal(currentPage(nav, noTabs), 'home');
  // Reconciling what needs nothing keeps it, so React sees no change.
  const fine = initialNav(tabs);
  assert.equal(reconcile(fine, tabs), fine);
});
