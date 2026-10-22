/**
 * A camera's motion (#29): the `motion` binary_sensor on the camera's own
 * device, never one merely sharing its Area.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cameraMoving } from './motion';
import type { Entity } from './types';

const entity = (id: string, deviceId: string | null, state = 'off', attributes: Record<string, unknown> = {}): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: 'esterno',
  deviceId,
  state,
  attributes,
  unavailable: state === 'unavailable' || state === 'unknown',
});

const motion = (id: string, deviceId: string | null, state: string) => entity(id, deviceId, state, { device_class: 'motion' });

const cancello = entity('camera.cancello', 'dev-cancello');
const giardino = entity('camera.giardino', 'dev-giardino');

test('a camera moves when the motion sensor on its own device detects', () => {
  const all = [cancello, giardino, motion('binary_sensor.cancello_movimento', 'dev-cancello', 'on')];

  assert.equal(cameraMoving(cancello, all), true);
});

test('motion on another device in the same Area is not this camera’s', () => {
  const all = [cancello, giardino, motion('binary_sensor.giardino_movimento', 'dev-giardino', 'on')];

  assert.equal(cameraMoving(cancello, all), false);
  assert.equal(cameraMoving(giardino, all), true);
});

test('a sensor on the device that is not a motion sensor does not count', () => {
  const all = [cancello, entity('binary_sensor.cancello_porta', 'dev-cancello', 'on', { device_class: 'door' })];

  assert.equal(cameraMoving(cancello, all), false);
});

test('a camera with no device never moves, even beside device-less motion sensors', () => {
  const loose = entity('camera.sciolta', null);
  const all = [loose, motion('binary_sensor.qualcosa', null, 'on')];

  assert.equal(cameraMoving(loose, all), false);
});

test('an Unavailable motion sensor is not motion', () => {
  const all = [cancello, motion('binary_sensor.cancello_movimento', 'dev-cancello', 'unavailable')];

  assert.equal(cameraMoving(cancello, all), false);
});

test('any one of several motion sensors on the device is enough', () => {
  const all = [
    cancello,
    motion('binary_sensor.cancello_persona', 'dev-cancello', 'off'),
    motion('binary_sensor.cancello_movimento', 'dev-cancello', 'on'),
  ];

  assert.equal(cameraMoving(cancello, all), true);
});
