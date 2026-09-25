/**
 * A `weather` entity worded in Italian (#33).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { conditionIcon, conditionLabel, dayLabel } from './weatherState';

test('every condition Home Assistant defines has an Italian name and an icon', () => {
  assert.equal(conditionLabel('partlycloudy'), 'Parzialmente nuvoloso');
  assert.equal(conditionLabel('sunny'), 'Soleggiato');
  assert.equal(conditionLabel('clear-night'), 'Sereno');
  assert.equal(conditionLabel('rainy'), 'Pioggia');
  assert.equal(conditionIcon('partlycloudy'), 'mdi:weather-partly-cloudy');
  assert.equal(conditionIcon('clear-night'), 'mdi:weather-night');
});

test('a condition the panel does not know keeps Home Assistant’s word for it', () => {
  assert.equal(conditionLabel('volcanic'), 'volcanic');
  assert.equal(conditionIcon('volcanic'), 'mdi:weather-cloudy-alert');
});

test('a forecast day is named by its Italian weekday, and today is "Oggi"', () => {
  const now = new Date('2026-09-25T10:00:00+02:00');
  assert.equal(dayLabel('2026-09-25T10:00:00+00:00', now), 'Oggi');
  assert.equal(dayLabel('2026-09-26T10:00:00+00:00', now), 'sab');
  assert.equal(dayLabel('2026-09-28T10:00:00+00:00', now), 'lun');
});
