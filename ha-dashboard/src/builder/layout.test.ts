import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Dashboard, Widget } from '../document/types';
import { newDashboard } from './draft';
import {
  addWidget,
  canPlace,
  cellAt,
  deleteWidget,
  freeSpot,
  minimumGrid,
  moved,
  overlaps,
  placeWidget,
  placedOnGrid,
  resized,
  snapDelta,
  updateWidget,
  type Grid,
  type Metrics,
} from './layout';

const fit: Grid = { columns: 12, rows: 8, overflow: 'fit' };
const scroll: Grid = { ...fit, overflow: 'scroll' };

/** Cells 90 x 80 px with 10 px gaps, from (100, 50): a pitch of 100 x 90. */
const metrics: Metrics = { left: 100, top: 50, column: 90, row: 80, gap: 10 };

const widget = (id: string, x: number, y: number, w = 1, h = 1): Widget => ({
  id,
  kind: 'clock',
  x,
  y,
  w,
  h,
  variant: 'full',
  title: null,
  on_tap: null,
  settings: {},
});

function wall(widgets: Widget[] = []): Dashboard {
  const d = newDashboard({ name: 'Wall', slug: 'wall' }, 'Home', () => 'home');
  return { ...d, pages: [{ ...d.pages[0], widgets }] };
}

test('the cell under a point counts pitches from the grid corner', () => {
  assert.deepEqual(cellAt(metrics, { x: 100, y: 50 }, fit), { x: 0, y: 0 });
  assert.deepEqual(cellAt(metrics, { x: 189, y: 129 }, fit), { x: 0, y: 0 });
  assert.deepEqual(cellAt(metrics, { x: 201, y: 141 }, fit), { x: 1, y: 1 });
  assert.deepEqual(cellAt(metrics, { x: 100 + 5 * 100 + 10, y: 50 + 3 * 90 + 10 }, fit), { x: 5, y: 3 });
});

test("a point in a gap belongs to the cell before it, up to the gap's middle", () => {
  assert.deepEqual(cellAt(metrics, { x: 194, y: 50 }, fit), { x: 0, y: 0 });
  assert.deepEqual(cellAt(metrics, { x: 196, y: 50 }, fit), { x: 1, y: 0 });
});

test('a point off the grid is in its nearest cell; below the last row only a scrolling Page goes on', () => {
  assert.deepEqual(cellAt(metrics, { x: 0, y: 0 }, fit), { x: 0, y: 0 });
  assert.deepEqual(cellAt(metrics, { x: 5000, y: 5000 }, fit), { x: 11, y: 7 });
  assert.deepEqual(cellAt(metrics, { x: 5000, y: 50 + 10 * 90 + 1 }, scroll), { x: 11, y: 10 });
});

test('a drag snaps to the nearest whole cell', () => {
  assert.deepEqual(snapDelta(metrics, 0, 0), { dx: 0, dy: 0 });
  assert.deepEqual(snapDelta(metrics, 49, 44), { dx: 0, dy: 0 });
  assert.deepEqual(snapDelta(metrics, 51, 46), { dx: 1, dy: 1 });
  assert.deepEqual(snapDelta(metrics, -260, -190), { dx: -3, dy: -2 });
});

test('a move stays on the grid, sliding along its edges', () => {
  assert.deepEqual(moved({ x: 2, y: 2, w: 3, h: 2 }, { dx: 1, dy: 1 }, fit), { x: 3, y: 3, w: 3, h: 2 });
  assert.deepEqual(moved({ x: 2, y: 2, w: 3, h: 2 }, { dx: -5, dy: 10 }, fit), { x: 0, y: 6, w: 3, h: 2 });
  assert.deepEqual(moved({ x: 2, y: 2, w: 3, h: 2 }, { dx: 20, dy: 0 }, fit), { x: 9, y: 2, w: 3, h: 2 });
  assert.deepEqual(moved({ x: 2, y: 2, w: 3, h: 2 }, { dx: 0, dy: 10 }, scroll), { x: 2, y: 12, w: 3, h: 2 });
});

test("a resize keeps one cell at least and stops at the grid's edge", () => {
  assert.deepEqual(resized({ x: 2, y: 2, w: 3, h: 2 }, { dx: 2, dy: 1 }, fit), { x: 2, y: 2, w: 5, h: 3 });
  assert.deepEqual(resized({ x: 2, y: 2, w: 3, h: 2 }, { dx: -9, dy: -9 }, fit), { x: 2, y: 2, w: 1, h: 1 });
  assert.deepEqual(resized({ x: 10, y: 6, w: 1, h: 1 }, { dx: 5, dy: 5 }, fit), { x: 10, y: 6, w: 2, h: 2 });
  assert.deepEqual(resized({ x: 10, y: 6, w: 1, h: 1 }, { dx: 0, dy: 5 }, scroll), { x: 10, y: 6, w: 1, h: 6 });
});

test('a box too big for the grid shrinks onto it', () => {
  assert.deepEqual(placedOnGrid({ x: 5, y: 5, w: 20, h: 20 }, fit), { x: 0, y: 0, w: 12, h: 8 });
});

test('two boxes overlap when they share a cell, not when they only touch', () => {
  assert.equal(overlaps({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 1, w: 2, h: 2 }), true);
  assert.equal(overlaps({ x: 0, y: 0, w: 2, h: 2 }, { x: 2, y: 0, w: 2, h: 2 }), false);
  assert.equal(overlaps({ x: 0, y: 0, w: 2, h: 2 }, { x: 0, y: 2, w: 2, h: 2 }), false);
});

test('a place is free when it is on the grid and shares no cell, the moving Widget aside', () => {
  const widgets = [widget('a', 0, 0, 2, 2), widget('b', 4, 0, 2, 2)];
  assert.equal(canPlace({ x: 2, y: 0, w: 2, h: 2 }, widgets, fit), true);
  assert.equal(canPlace({ x: 1, y: 0, w: 2, h: 2 }, widgets, fit), false);
  assert.equal(canPlace({ x: 1, y: 0, w: 2, h: 2 }, widgets, fit, 'a'), true);
  assert.equal(canPlace({ x: 11, y: 0, w: 2, h: 1 }, widgets, fit), false);
  assert.equal(canPlace({ x: 0, y: 7, w: 1, h: 2 }, widgets, fit), false);
  assert.equal(canPlace({ x: 0, y: 7, w: 1, h: 2 }, widgets, scroll), true);
});

test('a new Widget goes in the first free place, reading row by row', () => {
  const widgets = [widget('a', 0, 0, 4, 1)];
  assert.deepEqual(freeSpot(widgets, fit, { w: 4, h: 2 }), { x: 4, y: 0, w: 4, h: 2 });
  assert.deepEqual(freeSpot([widget('a', 0, 0, 12, 1)], fit, { w: 3, h: 1 }), { x: 0, y: 1, w: 3, h: 1 });
});

test('on a full Page a smaller box is tried, down to one cell, and then none', () => {
  const nearlyFull = [widget('a', 0, 0, 12, 7), widget('b', 0, 7, 11, 1)];
  assert.deepEqual(freeSpot(nearlyFull, fit, { w: 4, h: 3 }), { x: 11, y: 7, w: 1, h: 1 });
  assert.equal(freeSpot([widget('a', 0, 0, 12, 8)], fit, { w: 1, h: 1 }), null);
});

test('a scrolling Page always has room below its lowest Widget', () => {
  assert.deepEqual(freeSpot([widget('a', 0, 0, 12, 8)], scroll, { w: 4, h: 2 }), { x: 0, y: 8, w: 4, h: 2 });
});

test("a box bigger than the grid is placed at the grid's size", () => {
  assert.deepEqual(freeSpot([], { columns: 2, rows: 2, overflow: 'fit' }, { w: 4, h: 3 }), { x: 0, y: 0, w: 2, h: 2 });
});

test('the smallest grid a Page allows is what its Widgets reach', () => {
  const d = wall([widget('a', 0, 0, 3, 2), widget('b', 6, 4, 4, 3)]);
  assert.deepEqual(minimumGrid(d.pages[0]), { columns: 10, rows: 7 });
  assert.deepEqual(minimumGrid(wall().pages[0]), { columns: 1, rows: 1 });
});

test('a Widget is added where it fits, and refused where it does not', () => {
  const d = wall([widget('a', 0, 0, 2, 2)]);
  const added = addWidget(d, 'home', widget('b', 2, 0));
  assert.deepEqual(
    added.pages[0].widgets.map(w => w.id),
    ['a', 'b']
  );
  assert.equal(addWidget(d, 'home', widget('c', 1, 1)), d);
  assert.equal(addWidget(d, 'nowhere', widget('c', 5, 5)), d);
});

test('a move or resize lands only where the Widget may be, and changes nothing else', () => {
  const d = wall([widget('a', 0, 0, 2, 2), widget('b', 4, 0, 2, 2)]);
  const ok = placeWidget(d, 'home', 'a', { x: 0, y: 3, w: 3, h: 2 });
  assert.deepEqual(ok.pages[0].widgets[0], { ...widget('a', 0, 3, 3, 2) });
  assert.equal(ok.pages[0].widgets[1], d.pages[0].widgets[1]);
  assert.equal(placeWidget(d, 'home', 'a', { x: 3, y: 0, w: 2, h: 2 }), d, 'overlaps b');
  assert.equal(placeWidget(d, 'home', 'a', { x: 0, y: 7, w: 2, h: 2 }), d, 'below the last row');
  assert.equal(placeWidget(d, 'home', 'a', { x: 0, y: 0, w: 2, h: 2 }), d, 'no change');
});

test('a Widget is updated or deleted by id, on its Page only', () => {
  const d = wall([widget('a', 0, 0), widget('b', 1, 0)]);
  const u = updateWidget(d, 'home', 'b', { variant: 'compact', title: 'Ora' });
  assert.equal(u.pages[0].widgets[1].variant, 'compact');
  assert.equal(u.pages[0].widgets[1].title, 'Ora');
  assert.equal(u.pages[0].widgets[0], d.pages[0].widgets[0]);
  assert.deepEqual(
    deleteWidget(d, 'home', 'a').pages[0].widgets.map(w => w.id),
    ['b']
  );
  assert.equal(d.pages[0].widgets.length, 2, 'the argument is unchanged');
});
