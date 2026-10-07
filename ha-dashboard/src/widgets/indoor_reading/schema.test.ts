/**
 * Which entities an Indoor Reading takes (#65), read through its schema as
 * the renderer and the Builder read it.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateWidget } from '../../document/schema';
import type { Widget } from '../../document/types';
import { indoorReadingSchema } from './schema';

const widget = (settings: Record<string, unknown>): Widget => ({
  id: 'w',
  kind: 'indoor_reading',
  x: 0,
  y: 0,
  w: 4,
  h: 4,
  variant: 'full',
  title: null,
  on_tap: null,
  settings,
});

const check = (settings: Record<string, unknown>) => validateWidget(widget(settings), indoorReadingSchema);

test('the temperature is required, from a thermostat or a sensor', () => {
  assert.equal(check({}).ok, false);
  assert.deepEqual(check({ temperature: 'climate.t' }), { ok: true, settings: { temperature: 'climate.t', humidity: null } });
  assert.equal(check({ temperature: 'sensor.t' }).ok, true);
  assert.equal(check({ temperature: 'light.t' }).ok, false);
});

test('the humidity is optional, from a thermostat or a sensor', () => {
  assert.equal(check({ temperature: 'climate.t', humidity: 'sensor.h' }).ok, true);
  assert.equal(check({ temperature: 'climate.t', humidity: 'climate.t' }).ok, true);
  assert.equal(check({ temperature: 'climate.t', humidity: 'switch.h' }).ok, false);
});

test('a humidity entity Home Assistant no longer has leaves the reading, without its line', () => {
  const house = { hasEntity: (id: string) => id === 'climate.t', hasArea: () => false };
  const valid = validateWidget(widget({ temperature: 'climate.t', humidity: 'sensor.gone' }), indoorReadingSchema, { house });
  assert.deepEqual(valid, { ok: true, settings: { temperature: 'climate.t', humidity: null } });
});
