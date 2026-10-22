/**
 * How a Widget's `on_tap` is honoured, by what its kind does with a tap (#54).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { memberTap, roomTileTap, widgetTap } from './tap';

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

test("a Member's tap is decided by its Domain: kept with an Open button, or the whole row", () => {
  for (const id of ['light.a', 'switch.a', 'lock.a', 'climate.a', 'media_player.a', 'alarm_control_panel.a', 'vacuum.a', 'select.a']) {
    assert.deepEqual(memberTap(id, 'rooms', opens), { as: 'button', page: 'rooms' }, id);
  }
  for (const id of ['sensor.a', 'binary_sensor.a', 'weather.a']) {
    assert.deepEqual(memberTap(id, 'rooms', opens), { as: 'box', page: 'rooms' }, id);
  }
});

test("a Member's tap naming no ordinary Page, or none, adds nothing", () => {
  assert.deepEqual(memberTap('light.a', null, opens), { as: 'plain' });
  assert.deepEqual(memberTap('sensor.a', 'ring', opens), { as: 'plain' });
  assert.deepEqual(memberTap('light.a', 'gone', opens), { as: 'plain' });
});

test('a Room Tile opens its Page from its surface, as a Widget and as a Room Grid Member (ADR-0016)', () => {
  assert.deepEqual(widgetTap('surface', 'rooms', opens), { as: 'surface', page: 'rooms' });
  assert.deepEqual(roomTileTap('rooms', opens), { as: 'surface', page: 'rooms' });
});

test('a Room Tile with no Page, or one that no longer exists, adds nothing', () => {
  assert.deepEqual(widgetTap('surface', null, opens), { as: 'plain' });
  assert.deepEqual(roomTileTap(null, opens), { as: 'plain' });
  assert.deepEqual(roomTileTap('gone', opens), { as: 'plain' });
});
