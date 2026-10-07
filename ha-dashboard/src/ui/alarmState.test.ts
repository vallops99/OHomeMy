/**
 * What the alarm Modal offers (#30): the arm modes the panel supports while
 * disarmed, and only a disarm otherwise. Never a code.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Entity } from '../ha';
import { alarmCommands } from './alarmState';
import { DEFAULT_LOCALE, setViewerLocale } from '../i18n';

// In Italian, the copy of the house the panel was built for (#59).
setViewerLocale({ ...DEFAULT_LOCALE, language: 'it' });

const alarm = (state: string, supported_features = 15): Entity => ({
  id: 'alarm_control_panel.casa',
  domain: 'alarm_control_panel',
  name: 'Allarme',
  areaId: null,
  deviceId: null,
  labels: [],
  state,
  attributes: { supported_features },
  unavailable: state === 'unavailable',
});

const services = (entity: Entity) => alarmCommands(entity).map(c => c.service);

test('disarmed, it offers the arm modes the panel supports', () => {
  // 15 = home | away | night | trigger; trigger is not an arm mode.
  assert.deepEqual(services(alarm('disarmed')), ['alarm_arm_home', 'alarm_arm_away', 'alarm_arm_night']);
  assert.deepEqual(services(alarm('disarmed', 2)), ['alarm_arm_away']);
  assert.deepEqual(services(alarm('disarmed', 32)), ['alarm_arm_vacation']);
});

test('armed, arming, pending or triggered, it offers only a disarm', () => {
  for (const state of ['armed_away', 'armed_night', 'arming', 'pending', 'triggered']) {
    assert.deepEqual(services(alarm(state)), ['alarm_disarm'], state);
  }
});

test('an Unavailable alarm offers nothing', () => {
  assert.deepEqual(services(alarm('unavailable')), []);
});

test('each command is worded like the state it leads to', () => {
  assert.deepEqual(
    alarmCommands(alarm('disarmed', 3)).map(c => c.label),
    ['Inserisci in casa', 'Inserisci fuori casa']
  );
  assert.deepEqual(
    alarmCommands(alarm('armed_home')).map(c => c.label),
    ['Disinserisci']
  );
});

test('each command has a short label for the card, where the alarm is already named', () => {
  assert.deepEqual(
    alarmCommands(alarm('disarmed', 39)).map(c => c.short),
    ['In casa', 'Fuori casa', 'Notte', 'Vacanza']
  );
  assert.deepEqual(
    alarmCommands(alarm('triggered')).map(c => c.short),
    ['Disinserisci']
  );
});
