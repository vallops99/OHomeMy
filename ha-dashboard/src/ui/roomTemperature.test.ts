/**
 * A Row's temperature (CONTEXT.md, `main`): the room's, never a device's.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Area, Entity } from '../ha';
import { roomTemperature } from './roomTemperature';

const entity = (id: string, state: string, attributes: Record<string, unknown>, labels: string[] = []): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: 'camera_chri',
  deviceId: null,
  labels,
  state,
  attributes,
  unavailable: false,
});

const area = (...entities: Entity[]): Area => ({ id: 'camera_chri', name: 'Cameretta', labels: [], icon: null, entities });

test('a thermostat’s own reading is the room’s temperature', () => {
  const thermostat = entity('climate.t', 'heat', { current_temperature: 20.5 });
  const sensor = entity('sensor.t', '19', { device_class: 'temperature', unit_of_measurement: '°C' }, ['main']);
  assert.equal(roomTemperature(area(sensor, thermostat)), '20,5°');
});

test('a temperature sensor carrying `main` is the room’s temperature when there is no thermostat', () => {
  const sensor = entity('sensor.t', '19.26', { device_class: 'temperature', unit_of_measurement: '°C' }, ['main']);
  assert.equal(roomTemperature(area(sensor)), '19,3°C');
});

test('a temperature sensor without `main` is a device’s, not the room’s', () => {
  // An Echo reports its own chip temperature (#8): device class is not intent.
  const echo = entity('sensor.echo_temperatura', '21.5', { device_class: 'temperature', unit_of_measurement: '°C' });
  assert.equal(roomTemperature(area(echo)), null);
});
