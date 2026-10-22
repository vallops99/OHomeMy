/**
 * The Verdict per Dashboard (#53): the old ranking, counted over what the
 * Dashboard shows and nothing else.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DashboardShows } from '../document/shows';
import type { Entity } from './types';
import { concernAt, dashboardConcerns, verdictOf } from './verdict';

const entity = (id: string, state: string, extra: Partial<Entity> = {}): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: null,
  deviceId: null,
  labels: [],
  state,
  attributes: {},
  unavailable: state === 'unavailable' || state === 'unknown',
  ...extra,
});

const shows = (entities: string[], areas: Record<string, string[]> = {}): DashboardShows => ({
  entities: new Set(entities),
  areas: new Map(Object.entries(areas).map(([id, domains]) => [id, new Set(domains)])),
  inAreas: new Map(),
});

const door = (id: string, state: string) => entity(id, state, { attributes: { device_class: 'door' } });

test('a Fault is an Unavailable entity the Dashboard shows, and only that', () => {
  const house = [entity('camera.door', 'unavailable'), entity('camera.yard', 'unavailable'), entity('sensor.backup', 'unavailable')];
  const concerns = dashboardConcerns(house, shows(['camera.door']));
  assert.deepEqual(
    concerns.map(c => [c.level, c.entities.map(e => e.id)]),
    [['fault', ['camera.door']]]
  );
});

test('nothing shown, nothing to report', () => {
  assert.deepEqual(dashboardConcerns([entity('camera.door', 'unavailable'), door('binary_sensor.front', 'on')], shows([])), []);
  assert.equal(verdictOf([]), null);
});

test('worst first: a Fault, then an open way in, then a light left on', () => {
  const house = [
    entity('light.salone', 'on'),
    entity('lock.gate', 'unlocked'),
    door('binary_sensor.front', 'on'),
    door('binary_sensor.back', 'off'),
    entity('camera.door', 'unavailable'),
  ];
  const concerns = dashboardConcerns(house, shows(house.map(e => e.id)));
  assert.deepEqual(
    concerns.map(c => [c.level, c.entities.map(e => e.id)]),
    [
      ['fault', ['camera.door']],
      ['open', ['lock.gate', 'binary_sensor.front']],
      ['lit', ['light.salone']],
    ]
  );
  assert.equal(verdictOf(concerns)?.level, 'fault');
  assert.equal(concernAt(concerns, 'open')?.entities.length, 2);
});

test('a Fault is counted once, as a Fault, whatever its last state was', () => {
  const gate = entity('lock.gate', 'unavailable');
  const concerns = dashboardConcerns([gate], shows(['lock.gate']));
  assert.deepEqual(
    concerns.map(c => c.level),
    ['fault']
  );
});

test('an entity shown from its Area counts: an Unavailable light a Room Tile counts is a Fault', () => {
  const lamp = entity('light.lamp', 'unavailable', { areaId: 'salone' });
  const echo = entity('sensor.echo_temperature', 'unavailable', { areaId: 'salone' });
  const concerns = dashboardConcerns([lamp, echo], shows([], { salone: ['light'] }));
  assert.deepEqual(concernAt(concerns, 'fault')?.entities, [lamp]);
});

test('a light on is one a Widget names, not every light shown from an Area', () => {
  const chosen = entity('light.salone', 'on', { areaId: 'salone' });
  const other = entity('light.lamp', 'on', { areaId: 'salone' });
  const concerns = dashboardConcerns([chosen, other], shows(['light.salone'], { salone: ['light'] }));
  assert.deepEqual(concernAt(concerns, 'lit')?.entities, [chosen]);
});

test('a button resting at unknown is no Fault, but one Home Assistant cannot reach is', () => {
  const concerns = dashboardConcerns(
    [entity('button.restart', 'unknown'), entity('input_button.ring', 'unavailable')],
    shows(['button.restart', 'input_button.ring'])
  );
  assert.deepEqual(
    concernAt(concerns, 'fault')?.entities.map(e => e.id),
    ['input_button.ring']
  );
});

test('a sensor at unknown is a Fault: it is shown and says nothing', () => {
  const concerns = dashboardConcerns([entity('sensor.power', 'unknown')], shows(['sensor.power']));
  assert.equal(verdictOf(concerns)?.level, 'fault');
});
