/**
 * An entity's Area (#38): its own, else its device's, else its device's
 * parent's -- one level, as Home Assistant's frontend resolves it.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { effectiveAreaId } from './area';

const devices = {
  shelly: { area_id: 'ingresso' },
  hub: { area_id: 'salone' },
  child: { area_id: null, parent_device_id: 'hub' },
  orphan: { area_id: null, parent_device_id: 'gone' },
  grandchild: { area_id: null, parent_device_id: 'child' },
  loose: { area_id: null },
};

test("an entity's own Area wins, even over its device's", () => {
  assert.equal(effectiveAreaId('cucina', 'shelly', devices), 'cucina');
});

test("an entity with no Area of its own is in its device's", () => {
  assert.equal(effectiveAreaId(null, 'shelly', devices), 'ingresso');
  assert.equal(effectiveAreaId(undefined, 'shelly', devices), 'ingresso');
});

test("a device with no Area falls back to its parent device's", () => {
  assert.equal(effectiveAreaId(null, 'child', devices), 'salone');
});

test('the fallback stops at one parent level', () => {
  assert.equal(effectiveAreaId(null, 'grandchild', devices), null);
});

test('no device, an unknown one, or no Area anywhere is no Area', () => {
  assert.equal(effectiveAreaId(null, null, devices), null);
  assert.equal(effectiveAreaId(null, 'unknown', devices), null);
  assert.equal(effectiveAreaId(null, 'orphan', devices), null);
  assert.equal(effectiveAreaId(null, 'loose', devices), null);
});

test('a device registry not loaded yet is no Area, not a crash', () => {
  assert.equal(effectiveAreaId(null, 'shelly', undefined), null);
  assert.equal(effectiveAreaId(null, 'shelly', {}), null);
  assert.equal(effectiveAreaId('cucina', 'shelly', undefined), 'cucina');
});
