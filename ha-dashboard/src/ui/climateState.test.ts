/**
 * What a `climate` entity's attributes mean, for its full and compact forms
 * (#33).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Entity } from '../ha';
import { climateReading, hvacActionLabel, hvacModes, stepSetpoint } from './climateState';
import { DEFAULT_LOCALE, setViewerLocale } from '../i18n';

// In Italian, the copy of the house the panel was built for (#59).
setViewerLocale({ ...DEFAULT_LOCALE, language: 'it' });

const climate = (attributes: Record<string, unknown>, state = 'heat'): Entity => ({
  id: 'climate.termostato',
  domain: 'climate',
  name: 'Termostato',
  areaId: null,
  deviceId: null,
  state,
  attributes,
  unavailable: false,
});

const thermostat = climate({
  hvac_modes: ['heat', 'off'],
  min_temp: 5,
  max_temp: 30,
  target_temp_step: 0.5,
  current_temperature: 20.5,
  temperature: 21,
  hvac_action: 'idle',
});

test('the reading is the current temperature and the setpoint', () => {
  assert.deepEqual(climateReading(thermostat), { current: 20.5, target: 21 });
});

test('a climate reporting no numbers reads as nothing, not as zero', () => {
  assert.deepEqual(climateReading(climate({ current_temperature: null })), { current: null, target: null });
});

test('the setpoint steps by what the entity reports, and stays inside its range', () => {
  assert.equal(stepSetpoint(thermostat, 21, +1), 21.5);
  assert.equal(stepSetpoint(thermostat, 21, -1), 20.5);
  assert.equal(stepSetpoint(thermostat, 30, +1), 30);
  assert.equal(stepSetpoint(thermostat, 5, -1), 5);
});

test('a step of 0.1 lands on a tenth, not on a float’s idea of one', () => {
  const fine = climate({ target_temp_step: 0.1, min_temp: 5, max_temp: 30 });
  assert.equal(stepSetpoint(fine, 21, +1), 21.1);
  assert.equal(stepSetpoint(fine, 21.1, +1), 21.2);
  assert.equal(stepSetpoint(fine, 20.3, -1), 20.2);
});

test('with no step reported, Celsius steps by half a degree, as Home Assistant does', () => {
  assert.equal(stepSetpoint(climate({}), 21, +1), 21.5);
});

test('the modes are the ones the entity reports, worded in Italian', () => {
  assert.deepEqual(hvacModes(thermostat), [
    { mode: 'heat', label: 'Caldo', icon: 'mdi:fire' },
    { mode: 'off', label: 'Spento', icon: 'mdi:power' },
  ]);
  assert.deepEqual(
    hvacModes(climate({ hvac_modes: ['something_new'] })).map(m => m.label),
    ['something_new']
  );
});

test('what the climate is doing right now, in Italian', () => {
  assert.equal(hvacActionLabel(thermostat), 'Inattivo');
  assert.equal(hvacActionLabel(climate({ hvac_action: 'heating' })), 'Riscalda');
  // No action reported: the mode says as much as there is to say.
  assert.equal(hvacActionLabel(climate({}, 'off')), 'Spento');
  assert.equal(hvacActionLabel(climate({}, 'heat')), 'Riscaldamento');
});
