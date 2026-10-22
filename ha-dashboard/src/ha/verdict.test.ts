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

const group = (id: string, members: string[], state: string, extra: Partial<Entity> = {}) =>
  entity(id, state, { attributes: { entity_id: members }, ...extra });
const ids = (c: { entities: Entity[] } | null | undefined) => c?.entities.map(e => e.id);

test('a Room Tile naming a Light group counts its three members on, neither 1 nor 4', () => {
  const lights = [
    group('light.cucina', ['light.a', 'light.b', 'light.c'], 'on', { areaId: 'cucina' }),
    entity('light.a', 'on', { areaId: 'cucina' }),
    entity('light.b', 'on', { areaId: 'cucina' }),
    entity('light.c', 'on', { areaId: 'cucina' }),
  ];
  const s = shows([], { cucina: ['light'] });
  const named: DashboardShows = { ...s, inAreas: new Map([['light.cucina', new Set(['cucina'])]]) };
  assert.deepEqual(ids(concernAt(dashboardConcerns(lights, named), 'lit')), ['light.a', 'light.b', 'light.c']);
});

test('a Light group named only by a toggle counts its members that are on', () => {
  const lights = [
    group('light.cucina', ['light.a', 'light.b', 'light.c'], 'on'),
    entity('light.a', 'on'),
    entity('light.b', 'off'),
    entity('light.c', 'on'),
  ];
  assert.deepEqual(ids(concernAt(dashboardConcerns(lights, shows(['light.cucina'])), 'lit')), ['light.a', 'light.c']);
});

test('a light reached through a group and from its Area is counted once', () => {
  const lights = [group('light.g', ['light.a'], 'on', { areaId: 'cucina' }), entity('light.a', 'on', { areaId: 'cucina' })];
  assert.deepEqual(ids(concernAt(dashboardConcerns(lights, shows(['light.g'], { cucina: ['light'] })), 'lit')), ['light.a']);
});

test('an Area shown with only a single light, on, counts that light', () => {
  const lamp = entity('light.lamp', 'on', { areaId: 'salone' });
  assert.deepEqual(ids(concernAt(dashboardConcerns([lamp], shows([], { salone: ['light'] })), 'lit')), ['light.lamp']);
});

test('an Unavailable member of a shown Light group is a Fault', () => {
  const lights = [group('light.g', ['light.a', 'light.b'], 'on'), entity('light.a', 'on'), entity('light.b', 'unavailable')];
  const concerns = dashboardConcerns(lights, shows(['light.g']));
  assert.deepEqual(ids(concernAt(concerns, 'fault')), ['light.b']);
  assert.deepEqual(ids(concernAt(concerns, 'lit')), ['light.a']);
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
