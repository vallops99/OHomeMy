/**
 * The daily forecast from `weather/subscribe_forecast` (#33): Home Assistant
 * no longer puts it in the entity's attributes.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { forecastDays } from './forecast';

test('each day keeps its time, condition, high and low', () => {
  const event = {
    type: 'daily',
    forecast: [
      { datetime: '2026-09-25T10:00:00+00:00', condition: 'sunny', temperature: 24.1, templow: 14.2, precipitation: 0 },
      { datetime: '2026-09-26T10:00:00+00:00', condition: 'rainy', temperature: 19, templow: null },
    ],
  };
  assert.deepEqual(forecastDays(event, 5), [
    { datetime: '2026-09-25T10:00:00+00:00', condition: 'sunny', high: 24.1, low: 14.2 },
    { datetime: '2026-09-26T10:00:00+00:00', condition: 'rainy', high: 19, low: null },
  ]);
});

test('only the first few days are kept', () => {
  const day = (d: number) => ({ datetime: `2026-09-${d}T10:00:00+00:00`, condition: 'sunny', temperature: 20 });
  assert.equal(forecastDays({ forecast: [25, 26, 27, 28, 29, 30].map(day) }, 5).length, 5);
});

test('an event with no forecast, or a malformed one, is no days', () => {
  assert.deepEqual(forecastDays({ forecast: null }, 5), []);
  assert.deepEqual(forecastDays({}, 5), []);
  assert.deepEqual(forecastDays({ forecast: [{ condition: 'sunny' }] }, 5), []);
});
