/**
 * What an Indoor Reading says (#65): its temperature in whole degrees, its
 * humidity line, and an Unavailable entity said rather than hidden.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Entity } from '../../ha';
import { indoorReading } from './indoorReading';

const entity = (id: string, state: string, attributes: Record<string, unknown> = {}): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: null,
  deviceId: null,
  state,
  attributes,
  unavailable: state === 'unavailable',
});

test('a thermostat gives its own current temperature, a sensor its state, in whole degrees', () => {
  assert.equal(indoorReading(entity('climate.t', 'heat', { current_temperature: 20.6 }), null).temperature, '21°');
  assert.equal(indoorReading(entity('sensor.t', '19.4'), null).temperature, '19°');
});

test('a temperature that cannot be read is two dashes, as the wall has always shown it', () => {
  assert.equal(indoorReading(entity('climate.t', 'heat', {}), null).temperature, '--°');
  assert.equal(indoorReading(entity('sensor.t', 'unknown'), null).temperature, '--°');
  assert.equal(indoorReading(null, null).temperature, '--°');
});

test('an Unavailable temperature is a fault, never a silent gap', () => {
  const reading = indoorReading(entity('climate.t', 'unavailable', { current_temperature: 20 }), null);
  assert.equal(reading.temperature, '--°');
  assert.equal(reading.fault, true);
  assert.equal(indoorReading(entity('sensor.t', '20'), null).fault, false);
});

test('a humidity sensor gives its state, a thermostat its current humidity, rounded', () => {
  assert.deepEqual(indoorReading(null, entity('sensor.h', '54.4')).humidity, { text: '54% humidity', fault: false });
  assert.deepEqual(indoorReading(null, entity('climate.t', 'heat', { current_humidity: 61.5 })).humidity, {
    text: '62% humidity',
    fault: false,
  });
});

test('with no humidity chosen there is no humidity line', () => {
  assert.equal(indoorReading(entity('sensor.t', '20'), null).humidity, null);
});

test('a chosen humidity that cannot be read keeps its line and says so', () => {
  assert.deepEqual(indoorReading(null, entity('sensor.h', 'unavailable')).humidity, { text: 'Unavailable', fault: true });
  assert.deepEqual(indoorReading(null, entity('sensor.h', 'unknown')).humidity, { text: '--% humidity', fault: false });
});
