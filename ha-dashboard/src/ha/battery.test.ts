/**
 * A device's battery (#36): the `battery` sensor on the same device, whatever
 * its entity category -- a vacuum's is diagnostic, which the panel otherwise
 * never renders.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deviceBattery } from './battery';

const entries = [
  { entity_id: 'vacuum.robot', device_id: 'dev1' },
  { entity_id: 'sensor.robot_battery', device_id: 'dev1', entity_category: 'diagnostic' as const },
  { entity_id: 'sensor.other_battery', device_id: 'dev2' },
];
const states = {
  'sensor.robot_battery': { state: '86', attributes: { device_class: 'battery' } },
  'sensor.other_battery': { state: '12', attributes: { device_class: 'battery' } },
};

test('the battery is the battery sensor on the same device', () => {
  assert.equal(deviceBattery(entries, states, 'dev1'), 86);
  assert.equal(deviceBattery(entries, states, 'dev2'), 12);
});

test('no device, or none with a battery sensor, is no battery', () => {
  assert.equal(deviceBattery(entries, states, null), null);
  assert.equal(deviceBattery(entries, states, 'dev3'), null);
});

test('an unreachable battery reads as none, not as zero', () => {
  assert.equal(
    deviceBattery(entries, { 'sensor.robot_battery': { state: 'unavailable', attributes: { device_class: 'battery' } } }, 'dev1'),
    null
  );
});
