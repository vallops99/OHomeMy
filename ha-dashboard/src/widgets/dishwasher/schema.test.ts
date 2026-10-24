/**
 * Which entities a Dishwasher takes (#81), read through its schema as the
 * renderer and the Builder read it.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateWidget } from '../../document/schema';
import type { Widget } from '../../document/types';
import { GROUP_DOMAINS } from '../shared/domains';
import { dishwasherSchema } from './schema';

const widget = (settings: Record<string, unknown>): Widget => ({
  id: 'w',
  kind: 'dishwasher',
  x: 0,
  y: 0,
  w: 4,
  h: 4,
  variant: 'full',
  title: null,
  on_tap: null,
  settings,
});

const check = (settings: Record<string, unknown>) => validateWidget(widget(settings), dishwasherSchema);

test('only the State is required', () => {
  assert.equal(check({}).ok, false);
  assert.deepEqual(check({ state: 'sensor.d_operation_state' }), {
    ok: true,
    settings: {
      state: 'sensor.d_operation_state',
      ends_at: null,
      progress: null,
      door: null,
      salt: null,
      rinse_aid: null,
      start: null,
      stop: null,
      resume: null,
      pause: null,
      remote_start: null,
    },
  });
});

test('each setting takes the Domains of the spec', () => {
  const takes = (key: string, id: string) => check({ state: 'sensor.s', [key]: id }).ok;
  assert.equal(check({ state: 'binary_sensor.s' }).ok, false);
  for (const [key, good, bad] of [
    ['ends_at', 'sensor.e', 'binary_sensor.e'],
    ['progress', 'sensor.p', 'button.p'],
    ['door', 'sensor.d', 'switch.d'],
    ['door', 'binary_sensor.d', 'switch.d'],
    ['salt', 'sensor.s', 'button.s'],
    ['salt', 'binary_sensor.s', 'button.s'],
    ['rinse_aid', 'sensor.r', 'button.r'],
    ['rinse_aid', 'binary_sensor.r', 'button.r'],
    ['start', 'button.b', 'sensor.b'],
    ['start', 'script.b', 'sensor.b'],
    ['stop', 'button.b', 'script.b'],
    ['resume', 'button.b', 'script.b'],
    ['pause', 'button.b', 'script.b'],
    ['remote_start', 'binary_sensor.r', 'sensor.r'],
  ]) {
    assert.equal(takes(key, good), true, `${key} takes ${good}`);
    assert.equal(takes(key, bad), false, `${key} refuses ${bad}`);
  }
});

test('Ends at and Progress are never a Fault, and the Door never an open way in', () => {
  const s = dishwasherSchema.settings;
  assert.equal(s.ends_at.neverFault, true);
  assert.equal(s.progress.neverFault, true);
  assert.equal(s.door.notWayIn, true);
  assert.equal('neverFault' in s.state, false);
});

test('the State declares error as a Malfunction', () => {
  assert.deepEqual(dishwasherSchema.settings.state.malfunction, ['error']);
});

test('a Dishwasher cannot be a Group Member', () => {
  assert.ok(!GROUP_DOMAINS.includes('dishwasher'));
});
