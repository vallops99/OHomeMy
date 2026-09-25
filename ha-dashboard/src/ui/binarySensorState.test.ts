/**
 * A `binary_sensor` worded by its device class (#34): a contact is
 * `Aperta`/`Chiusa`, and open is the Verdict's open way in.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Entity } from '../ha';
import { binarySensorView } from './binarySensorState';

const sensor = (state: string, device_class?: string): Entity => ({
  id: 'binary_sensor.x',
  domain: 'binary_sensor',
  name: 'X',
  areaId: 'ingresso',
  deviceId: null,
  labels: [],
  state,
  attributes: device_class ? { device_class } : {},
  unavailable: state === 'unavailable' || state === 'unknown',
});

test('a door, a window or an opening reads Aperta or Chiusa', () => {
  for (const cls of ['door', 'window', 'opening']) {
    assert.equal(binarySensorView(sensor('on', cls)).label, 'Aperta');
    assert.equal(binarySensorView(sensor('off', cls)).label, 'Chiusa');
  }
});

test('an open contact is an open way in, exactly as the Verdict counts one', () => {
  assert.equal(binarySensorView(sensor('on', 'door')).open, true);
  assert.equal(binarySensorView(sensor('off', 'door')).open, false);
  // Not a way in, however "on" it is.
  assert.equal(binarySensorView(sensor('on', 'problem')).open, false);
});

test('the icon follows the state, and an open contact takes the Verdict’s open icon', () => {
  assert.equal(binarySensorView(sensor('on', 'door')).icon, 'mdi:door-open');
  assert.equal(binarySensorView(sensor('off', 'door')).icon, 'mdi:door-closed');
  assert.equal(binarySensorView(sensor('off', 'window')).icon, 'mdi:window-closed');
});

test('a class the panel does not word reads as on or off', () => {
  assert.equal(binarySensorView(sensor('on')).label, 'Acceso');
  assert.equal(binarySensorView(sensor('off', 'something_new')).label, 'Spento');
});

test('an Unavailable sensor says so', () => {
  assert.equal(binarySensorView(sensor('unavailable', 'door')).label, 'Non disponibile');
  assert.equal(binarySensorView(sensor('unavailable', 'door')).open, false);
});

test('a problem reads "Da ricaricare" when on, as the dishwasher’s salt and rinse aid do (#36)', () => {
  assert.equal(binarySensorView(sensor('on', 'problem')).label, 'Da ricaricare');
  assert.equal(binarySensorView(sensor('off', 'problem')).label, 'OK');
});
