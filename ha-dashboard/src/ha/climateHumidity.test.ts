/**
 * A thermostat's humidity: its own `current_humidity`, or the `humidity`
 * sensor on its own device, never one merely sharing its Area.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { climateHumidity } from './climateHumidity';
import type { Entity } from './types';

const entity = (id: string, deviceId: string | null, state = 'on', attributes: Record<string, unknown> = {}): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: 'corridoio',
  deviceId,
  state,
  attributes,
  unavailable: state === 'unavailable' || state === 'unknown',
});

const humidity = (id: string, deviceId: string | null, state: string) => entity(id, deviceId, state, { device_class: 'humidity' });

const termostato = entity('climate.termostato', 'dev-smarther', 'heat');

test('the humidity sensor on the thermostat’s own device', () => {
  const all = [termostato, humidity('sensor.termostato_umidita', 'dev-smarther', '70')];

  assert.equal(climateHumidity(termostato, all), 70);
});

test('the thermostat’s own current_humidity wins over a sensor on its device', () => {
  const own = entity('climate.termostato', 'dev-smarther', 'heat', { current_humidity: 55 });
  const all = [own, humidity('sensor.termostato_umidita', 'dev-smarther', '70')];

  assert.equal(climateHumidity(own, all), 55);
});

test('a humidity sensor on another device in the same Area is not the thermostat’s', () => {
  const all = [termostato, humidity('sensor.echo_umidita', 'dev-echo', '40')];

  assert.equal(climateHumidity(termostato, all), null);
});

test('a sensor on the device that is not a humidity sensor does not count', () => {
  const all = [termostato, entity('sensor.termostato_batteria', 'dev-smarther', '90', { device_class: 'battery' })];

  assert.equal(climateHumidity(termostato, all), null);
});

test('an Unavailable or unreadable humidity sensor gives no humidity', () => {
  assert.equal(climateHumidity(termostato, [termostato, humidity('sensor.a', 'dev-smarther', 'unavailable')]), null);
  assert.equal(climateHumidity(termostato, [termostato, humidity('sensor.a', 'dev-smarther', 'abc')]), null);
});

test('a thermostat with no device has only its own reading', () => {
  const loose = entity('climate.termostato', null, 'heat');
  const all = [loose, humidity('sensor.nowhere', null, '60')];

  assert.equal(climateHumidity(loose, all), null);
});
