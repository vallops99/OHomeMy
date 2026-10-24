/**
 * What a Dishwasher says and offers (#81): the state table, the countdown
 * from Ends at, and which controls the state allows.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Entity } from '../../ha';
import { fmt } from '../../i18n';
import { controlsFor, countdown, dishwasher, stateLine, type DishwasherInput } from './dishwasher';

const entity = (id: string, state: string, attributes: Record<string, unknown> = {}): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: null,
  deviceId: null,
  state,
  attributes,
  unavailable: state === 'unavailable' || state === 'unknown',
});

const NOW = new Date('2026-10-24T12:00:00Z');
const inMinutes = (m: number, extraMs = 0) => new Date(NOW.getTime() + m * 60_000 + extraMs).toISOString();

test('the state table says each Home Connect state in its tone', () => {
  const at = new Date('2026-10-24T22:30:00');
  assert.deepEqual(stateLine('inactive', null), { text: 'Off', tone: 'muted' });
  assert.deepEqual(stateLine('ready', null), { text: 'Ready', tone: 'muted' });
  assert.deepEqual(stateLine('delayedstart', at), { text: `Starts at ${fmt.time(at)}`, tone: 'accent' });
  assert.deepEqual(stateLine('run', null), { text: 'Running', tone: 'accent' });
  assert.deepEqual(stateLine('pause', null), { text: 'Paused', tone: 'accent' });
  assert.deepEqual(stateLine('actionrequired', null), { text: 'Needs attention', tone: 'warning' });
  assert.deepEqual(stateLine('finished', null), { text: 'Done', tone: 'success' });
  assert.deepEqual(stateLine('error', null), { text: 'Error', tone: 'warning' });
  assert.deepEqual(stateLine('aborting', null), { text: 'Stopping', tone: 'accent' });
});

test('any other state is shown as raw text, muted', () => {
  assert.deepEqual(stateLine('descaling', null), { text: 'descaling', tone: 'muted' });
});

test('the countdown reads in minutes, then hours, rounding minutes up', () => {
  const at = (m: number, extraMs = 0) => countdown(new Date(inMinutes(m, extraMs)), NOW);
  assert.equal(at(0), 'Almost done');
  assert.equal(at(0, 59_000), 'Almost done');
  assert.equal(at(1), '1 min');
  assert.equal(at(35), '35 min');
  assert.equal(at(59), '59 min');
  assert.equal(at(60), '1 h');
  assert.equal(at(320), '5 h 20 min');
  assert.equal(at(300), '5 h');
  assert.equal(at(34, 1_000), '35 min');
  assert.equal(at(59, 1_000), '1 h');
});

test('an end time already past while still running is Almost done', () => {
  assert.equal(countdown(new Date(inMinutes(-12)), NOW), 'Almost done');
});

const input = (state: string, extra: Partial<DishwasherInput> = {}): DishwasherInput => ({
  state: entity('sensor.d_operation_state', state),
  endsAt: null,
  progress: null,
  door: null,
  salt: null,
  rinseAid: null,
  remoteStart: null,
  chosen: { start: true, stop: true, resume: true, pause: true },
  ...extra,
});

test('control visibility follows the state', () => {
  const shown = (state: string) =>
    Object.entries(controlsFor(input(state)))
      .filter(([, c]) => c !== null)
      .map(([k]) => k);
  assert.deepEqual(shown('ready'), ['start']);
  assert.deepEqual(shown('inactive'), ['start']);
  assert.deepEqual(shown('run'), ['stop', 'pause']);
  assert.deepEqual(shown('pause'), ['stop', 'resume']);
  assert.deepEqual(shown('delayedstart'), ['stop']);
  assert.deepEqual(shown('finished'), []);
  assert.deepEqual(shown('error'), []);
  assert.deepEqual(shown('actionrequired'), []);
  assert.deepEqual(shown('aborting'), []);
  assert.deepEqual(shown('unavailable'), []);
});

test('a control is shown only when its entity is chosen', () => {
  const none = { start: false, stop: false, resume: false, pause: false };
  assert.deepEqual(controlsFor(input('ready', { chosen: none })).start, null);
  assert.deepEqual(controlsFor(input('run', { chosen: { ...none, stop: true } })).pause, null);
});

test('Start is disabled, with its hint, while the chosen Remote start is off', () => {
  const off = entity('binary_sensor.d_remote_start', 'off');
  const on = entity('binary_sensor.d_remote_start', 'on');
  assert.deepEqual(controlsFor(input('ready', { remoteStart: off })).start, {
    disabled: true,
    hint: 'Allow remote start on the dishwasher',
    held: false,
  });
  assert.deepEqual(controlsFor(input('ready', { remoteStart: on })).start, { disabled: false, hint: null, held: false });
  assert.deepEqual(controlsFor(input('ready')).start, { disabled: false, hint: null, held: false });
});

test('Stop needs a hold; the others act at once', () => {
  const c = controlsFor(input('pause'));
  assert.equal(c.stop?.held, true);
  assert.equal(c.resume?.held, false);
});

test('an Unavailable State is a fault with no line, countdown or controls', () => {
  const view = dishwasher(input('unavailable', { endsAt: entity('sensor.e', inMinutes(30)) }), NOW);
  assert.equal(view.fault, true);
  assert.deepEqual(view.controls, { start: null, stop: null, resume: null, pause: null });
});

test('while running it counts down to Ends at, and shows progress', () => {
  const view = dishwasher(input('run', { endsAt: entity('sensor.e', inMinutes(35)), progress: entity('sensor.p', '42.4') }), NOW);
  assert.equal(view.fault, false);
  assert.equal(view.line.text, 'Running');
  assert.equal(view.countdown, '35 min');
  assert.equal(view.progress, 42);
});

test('an Unavailable Ends at or Progress leaves its line out, without a fault', () => {
  const view = dishwasher(input('run', { endsAt: entity('sensor.e', 'unavailable'), progress: entity('sensor.p', 'unavailable') }), NOW);
  assert.equal(view.fault, false);
  assert.equal(view.countdown, null);
  assert.equal(view.progress, null);
});

test('there is no countdown when nothing runs, even with a stale Ends at', () => {
  assert.equal(dishwasher(input('ready', { endsAt: entity('sensor.e', inMinutes(35)) }), NOW).countdown, null);
});

test('a delayed start says when it starts, from Ends at', () => {
  const start = inMinutes(90);
  const view = dishwasher(input('delayedstart', { endsAt: entity('sensor.e', start) }), NOW);
  assert.equal(view.line.text, `Starts at ${fmt.time(new Date(start))}`);
  assert.equal(view.countdown, null);
});

test('the door is said when chosen: open, or closed', () => {
  assert.equal(dishwasher(input('ready', { door: entity('sensor.d', 'open') }), NOW).door, 'Door open');
  assert.equal(dishwasher(input('ready', { door: entity('sensor.d', 'locked') }), NOW).door, 'Door closed');
  assert.equal(dishwasher(input('ready', { door: entity('binary_sensor.d', 'on') }), NOW).door, 'Door open');
  assert.equal(dishwasher(input('ready', { door: entity('binary_sensor.d', 'off') }), NOW).door, 'Door closed');
  assert.equal(dishwasher(input('ready', { door: entity('sensor.d', 'unavailable') }), NOW).door, null);
  assert.equal(dishwasher(input('ready'), NOW).door, null);
});

test('a door in any other state says nothing', () => {
  for (const state of ['opening', 'unknown', 'on_fire', ''])
    assert.equal(dishwasher(input('ready', { door: entity('sensor.d', state) }), NOW).door, null);
});

test('salt and rinse aid warn while their state is not off, and never otherwise', () => {
  const warn = (salt: string | null, rinse: string | null) =>
    dishwasher(
      input('ready', {
        salt: salt === null ? null : entity('sensor.salt', salt),
        rinseAid: rinse === null ? null : entity('binary_sensor.rinse', rinse),
      }),
      NOW
    ).warnings;
  assert.deepEqual(warn('off', 'off'), []);
  assert.deepEqual(warn('present', 'on'), ['Salt low', 'Rinse aid low']);
  assert.deepEqual(warn('confirmed', 'off'), ['Salt low']);
  assert.deepEqual(warn('unavailable', 'unavailable'), []);
  assert.deepEqual(warn(null, null), []);
});
