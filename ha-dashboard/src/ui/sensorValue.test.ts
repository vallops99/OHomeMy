/**
 * A `sensor`'s current value, worded for its tile (#33): value, unit and
 * icon by device class.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Entity } from '../ha';
import { sensorIcon, sensorReading } from './sensorValue';
import { DEFAULT_LOCALE, setViewerLocale } from '../i18n';

// In Italian, the copy of the house the panel was built for (#59).
setViewerLocale({ ...DEFAULT_LOCALE, language: 'it' });

const sensor = (state: string, attributes: Record<string, unknown> = {}): Entity => ({
  id: 'sensor.x',
  domain: 'sensor',
  name: 'X',
  areaId: null,
  deviceId: null,
  state,
  attributes,
  unavailable: state === 'unavailable' || state === 'unknown',
});

test('a number reads with an Italian comma and its unit', () => {
  assert.deepEqual(sensorReading(sensor('143.25', { unit_of_measurement: 'kWh' })), { value: '143,3', unit: 'kWh' });
  assert.deepEqual(sensorReading(sensor('47.0', { unit_of_measurement: '%' })), { value: '47', unit: '%' });
});

test('a sensor with no unit reads as its value alone', () => {
  assert.deepEqual(sensorReading(sensor('320')), { value: '320', unit: null });
});

test('a sensor whose state is text reads as that text', () => {
  assert.deepEqual(sensorReading(sensor('Lavaggio')), { value: 'Lavaggio', unit: null });
});

test('an Unavailable sensor says so', () => {
  assert.deepEqual(sensorReading(sensor('unavailable', { unit_of_measurement: '°C' })), { value: 'Non disponibile', unit: null });
});

test('the icon comes from the device class, and a custom icon wins', () => {
  assert.equal(sensorIcon(sensor('21', { device_class: 'temperature' })), 'mdi:thermometer');
  assert.equal(sensorIcon(sensor('47', { device_class: 'humidity' })), 'mdi:water-percent');
  assert.equal(sensorIcon(sensor('320', { device_class: 'power' })), 'mdi:flash');
  assert.equal(sensorIcon(sensor('143', { device_class: 'energy' })), 'mdi:lightning-bolt');
  assert.equal(sensorIcon(sensor('1', { device_class: 'something_new' })), 'mdi:gauge');
  assert.equal(sensorIcon(sensor('21', { device_class: 'temperature', icon: 'mdi:home-thermometer' })), 'mdi:home-thermometer');
});
