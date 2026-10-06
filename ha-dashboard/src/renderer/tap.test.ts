/**
 * How a Widget's `on_tap` is honoured, by what its kind does with a tap (#54).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { widgetTap } from './tap';

const opens = (page: string) => page === 'rooms';

test('a Widget with no on_tap is left alone, except a Link, which is skipped', () => {
  assert.deepEqual(widgetTap(undefined, null, opens), { as: 'plain' });
  assert.deepEqual(widgetTap('none', null, opens), { as: 'plain' });
  assert.deepEqual(widgetTap('page', null, opens), { as: 'skipped' });
});

test('a kind with its own tap keeps it, and gains an Open button', () => {
  assert.deepEqual(widgetTap(undefined, 'rooms', opens), { as: 'button', page: 'rooms' });
  assert.deepEqual(widgetTap('own', 'rooms', opens), { as: 'button', page: 'rooms' });
});

test('a kind with no tap of its own becomes the way to the Page, the whole box', () => {
  assert.deepEqual(widgetTap('none', 'rooms', opens), { as: 'box', page: 'rooms' });
  assert.deepEqual(widgetTap('page', 'rooms', opens), { as: 'box', page: 'rooms' });
});

test('an on_tap naming no ordinary Page counts as none', () => {
  assert.deepEqual(widgetTap('own', 'ring', opens), { as: 'plain' });
  assert.deepEqual(widgetTap('page', 'ring', opens), { as: 'skipped' });
});
