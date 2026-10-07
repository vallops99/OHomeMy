/**
 * The Chip Row (#53): which chips there are, in what order, and what each
 * says, from the Dashboard's Concerns.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Entity } from '../../ha';
import type { Concern } from '../../ha/verdict';
import { chipRow, concernHeadline } from './chips';

const entity = (id: string, parts: Partial<Entity> = {}): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: null,
  deviceId: null,
  labels: [],
  state: 'off',
  attributes: {},
  unavailable: false,
  ...parts,
});

const down = (id: string) => entity(id, { state: 'unavailable', unavailable: true });
const concern = (level: Concern['level'], ...entities: Entity[]): Concern => ({ level, entities });
const alarm = entity('alarm_control_panel.casa', { state: 'disarmed' });
const cameras = ['camera.a', 'camera.b', 'camera.c'].map(id => entity(id));

test('the order is Fault, open way in, cameras, alarm, never capped', () => {
  const row = chipRow({
    concerns: [concern('fault', down('light.a')), concern('open', entity('lock.gate')), concern('lit', entity('light.b'))],
    cameras,
    moving: [],
    alarm,
  });
  assert.deepEqual(
    row.map(c => c.key),
    ['fault', 'open', 'cameras', 'alarm']
  );
});

test('only a Fault is in the alert tone, and lights on are no chip', () => {
  const row = chipRow({
    concerns: [concern('open', entity('lock.gate')), concern('lit', entity('light.b'))],
    cameras: [],
    moving: [],
    alarm: null,
  });
  assert.deepEqual(
    row.map(c => [c.key, c.tone]),
    [['open', 'neutral']]
  );
  const fault = chipRow({ concerns: [concern('fault', down('camera.a'))], cameras: [], moving: [], alarm: null });
  assert.equal(fault[0].tone, 'alert');
});

test('a Concern chip counts its entities and opens its Concern list', () => {
  const [chip] = chipRow({ concerns: [concern('fault', down('a.a'), down('b.b'))], cameras: [], moving: [], alarm: null });
  assert.equal(chip.text, '2 faults');
  assert.deepEqual(chip.opens, { kind: 'concern', level: 'fault' });
  const [one] = chipRow({ concerns: [concern('open', entity('lock.gate'))], cameras: [], moving: [], alarm: null });
  assert.equal(one.text, '1 way in open');
});

test('the lit Concern list counts lights on, not Areas', () => {
  assert.equal(concernHeadline(concern('lit', entity('light.a'))), '1 light on');
  assert.equal(concernHeadline(concern('lit', entity('light.a'), entity('light.b'), entity('light.c'))), '3 lights on');
});

test('the camera chip says Unavailable ahead of motion, and opens nothing', () => {
  const moving = [cameras[0]];
  const quiet = chipRow({ concerns: [], cameras, moving: [], alarm: null })[0];
  assert.equal(quiet.text, '3 cameras · no motion');
  assert.equal(quiet.opens, null);
  assert.equal(chipRow({ concerns: [], cameras, moving, alarm: null })[0].text, '3 cameras · motion detected');
  const faulted = chipRow({ concerns: [], cameras: [down('camera.x'), ...cameras], moving, alarm: null })[0];
  assert.equal(faulted.text, '4 cameras · 1 unavailable');
  assert.equal(faulted.icon, 'mdi:cctv-off');
  assert.equal(faulted.tone, 'neutral');
});

test('nothing to say, no chips', () => {
  assert.deepEqual(chipRow({ concerns: [], cameras: [], moving: [], alarm: null }), []);
});
