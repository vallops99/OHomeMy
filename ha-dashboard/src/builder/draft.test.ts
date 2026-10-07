import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Dashboard, OHomeMyDocument } from '../document/types';
import {
  addDashboard,
  dashboardChanges,
  deleteDashboard,
  duplicateDashboard,
  nameProblem,
  newDashboard,
  renameDashboard,
  sameJson,
} from './draft';

/** Ids `id-1`, `id-2`, ... in the order they are asked for. */
const counter = () => {
  let n = 0;
  return () => `id-${++n}`;
};

/** A Dashboard with two Pages, a Navbar, and Widgets that open Pages. */
function wall(): Dashboard {
  const dashboard = newDashboard({ name: 'Wall', slug: 'wall' }, 'Home', () => 'x');
  return {
    ...dashboard,
    id: 'wall',
    home_page: 'home',
    navbar: { edge: 'bottom', tabs: false, items: [{ id: 'nav-1', page: 'climate', icon: 'mdi:thermometer' }] },
    pages: [
      {
        id: 'home',
        name: 'Home',
        popup: null,
        grid: { columns: 12, rows: 8 },
        widgets: [
          { id: 'w-1', kind: 'link', x: 0, y: 0, w: 2, h: 2, variant: 'full', title: null, on_tap: 'climate', settings: { a: [1] } },
          { id: 'w-2', kind: 'clock', x: 2, y: 0, w: 2, h: 1, variant: 'full', title: 'Now', on_tap: null, settings: {} },
        ],
      },
      { id: 'climate', name: 'Climate', popup: null, grid: { columns: 12, rows: 8 }, widgets: [] },
    ],
  };
}

const doc = (...dashboards: Dashboard[]): OHomeMyDocument => ({ dashboards });

test('a new Dashboard has one empty Home Page and the slug it was given', () => {
  const d = newDashboard({ name: '  Wall tablet ', slug: 'wall-tablet' }, 'Home', counter());
  assert.equal(d.name, 'Wall tablet');
  assert.equal(d.slug, 'wall-tablet');
  assert.equal(d.show_in_sidebar, true);
  assert.equal(d.pages.length, 1);
  assert.equal(d.home_page, d.pages[0].id);
  assert.equal(d.pages[0].name, 'Home');
  assert.equal(d.pages[0].popup, null);
  assert.deepEqual(d.pages[0].widgets, []);
  assert.notEqual(d.id, d.pages[0].id);
  assert.equal(d.navbar, null);
  // Dark, so a new wall panel never lights up a room at night (#70).
  assert.deepEqual(d.settings.theme, { name: 'casa-panel', mode: 'dark' });
});

test('a name must not be blank', () => {
  assert.equal(nameProblem('Wall'), null);
  assert.equal(nameProblem('   '), 'empty');
});

test('adding puts the Dashboard last, and leaves the old document alone', () => {
  const before = doc(wall());
  const after = addDashboard(before, newDashboard({ name: 'Phone', slug: 'phone' }, 'Home', counter()));
  assert.deepEqual(
    after.dashboards.map(d => d.slug),
    ['wall', 'phone']
  );
  assert.equal(before.dashboards.length, 1);
});

test('a rename keeps the slug', () => {
  const after = renameDashboard(doc(wall()), 'wall', ' Entrance ');
  assert.equal(after.dashboards[0].name, 'Entrance');
  assert.equal(after.dashboards[0].slug, 'wall');
});

test('deleting removes only that Dashboard', () => {
  const phone = { ...wall(), id: 'phone', slug: 'phone' };
  const after = deleteDashboard(doc(wall(), phone), 'wall');
  assert.deepEqual(
    after.dashboards.map(d => d.id),
    ['phone']
  );
});

test('a duplicate sits after its original, with new ids and its own slug and name', () => {
  const phone = { ...wall(), id: 'phone', slug: 'phone' };
  const { document, dashboard } = duplicateDashboard(doc(wall(), phone), 'wall', { name: 'Wall (copy)', slug: 'wall-copy' }, counter());

  assert.deepEqual(
    document.dashboards.map(d => d.slug),
    ['wall', 'wall-copy', 'phone']
  );
  assert.equal(dashboard.name, 'Wall (copy)');
  const ids = [
    dashboard.id,
    ...dashboard.pages.map(p => p.id),
    ...dashboard.pages.flatMap(p => p.widgets.map(w => w.id)),
    ...dashboard.navbar!.items.map(i => i.id),
  ];
  const original = new Set(['wall', 'home', 'climate', 'w-1', 'w-2', 'nav-1']);
  assert.ok(
    ids.every(id => !original.has(id)),
    ids.join()
  );
  assert.equal(new Set(ids).size, ids.length);
});

test("a duplicate's references follow its Pages to their new ids", () => {
  const { dashboard } = duplicateDashboard(doc(wall()), 'wall', { name: 'Copy', slug: 'copy' }, counter());
  const [home, climate] = dashboard.pages;
  assert.equal(dashboard.home_page, home.id);
  assert.equal(dashboard.navbar!.items[0].page, climate.id);
  assert.equal(home.widgets[0].on_tap, climate.id);
  assert.equal(home.widgets[1].on_tap, null);
});

test('a duplicate shares nothing with its original', () => {
  const original = wall();
  const { dashboard } = duplicateDashboard(doc(original), 'wall', { name: 'Copy', slug: 'copy' }, counter());
  (dashboard.pages[0].widgets[0].settings.a as number[]).push(2);
  dashboard.settings.supported_range.min.width = 1;
  assert.deepEqual(original.pages[0].widgets[0].settings, { a: [1] });
  assert.equal(original.settings.supported_range.min.width, 1280);
});

test('changes name the new, the changed and the deleted Dashboards', () => {
  const phone = { ...wall(), id: 'phone', slug: 'phone' };
  const kiosk = { ...wall(), id: 'kiosk', slug: 'kiosk' };
  const base = doc(wall(), phone, kiosk);
  const draft = addDashboard(renameDashboard(deleteDashboard(base, 'kiosk'), 'phone', 'Phone'), {
    ...wall(),
    id: 'new',
    slug: 'new',
  });

  const { changes, deleted } = dashboardChanges(base, draft);
  assert.deepEqual(
    [...changes],
    [
      ['phone', 'changed'],
      ['new', 'new'],
    ]
  );
  assert.deepEqual(
    deleted.map(d => d.id),
    ['kiosk']
  );
});

test('the same JSON is the same whatever the order of its keys', () => {
  assert.ok(sameJson({ a: 1, b: [1, { c: null }] }, { b: [1, { c: null }], a: 1 }));
  assert.ok(!sameJson({ a: 1 }, { a: 1, b: undefined }));
  assert.ok(!sameJson([1, 2], [2, 1]));
  assert.ok(!sameJson({ a: null }, { a: {} }));
  assert.ok(!sameJson([], {}));
});
