/**
 * The Concern list's pure half (#30): which Concern is still live, and the
 * rows it shows, named with their Areas and ordered.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Area, Entity, Health, HouseReport } from '../ha';
import { NO_AREA, concernRows, liveConcern } from './concernList';

const entity = (id: string, name: string, areaId: string | null): Entity => ({
  id,
  domain: id.split('.')[0],
  name,
  areaId,
  deviceId: null,
  labels: [],
  state: 'unavailable',
  attributes: {},
  unavailable: true,
});

const area = (id: string, name: string): Area => ({ id, name, labels: [], icon: null, entities: [] });

const health = (level: Health['level'], entities: Entity[]): Health => ({
  level,
  headline: level,
  detail: null,
  count: entities.length,
  entities,
});

const report = (verdict: Health, ...also: Health[]): HouseReport => ({ verdict, also });

// ---- liveConcern -----------------------------------------------------------

test('the Concern is found whether it leads the report or follows it', () => {
  const fault = health('fault', [entity('light.a', 'A', null)]);
  const open = health('open', [entity('lock.b', 'B', null)]);
  assert.equal(liveConcern(report(fault, open), 'fault'), fault);
  assert.equal(liveConcern(report(fault, open), 'open'), open);
});

test('a Concern that has cleared is gone', () => {
  const open = health('open', [entity('lock.b', 'B', null)]);
  assert.equal(liveConcern(report(open), 'fault'), null);
  assert.equal(liveConcern(report(health('ok', [])), 'open'), null);
});

test('"ok" is never a Concern, even though it is a verdict', () => {
  assert.equal(liveConcern(report(health('ok', [])), 'ok'), null);
});

// ---- concernRows -----------------------------------------------------------

const areas = [area('salone', 'Salone'), area('cucina', 'Cucina'), area('camera_chri', 'Camera Chri')];

test('each row is named with its Area, and one with none says so', () => {
  const rows = concernRows(health('fault', [entity('light.a', 'Lampada', 'salone'), entity('sensor.b', 'Sensore', null)]), areas);
  assert.deepEqual(
    rows.map(r => [r.entity.id, r.areaName]),
    [
      ['light.a', 'Salone'],
      ['sensor.b', NO_AREA],
    ]
  );
  assert.equal(NO_AREA, 'Senza stanza');
});

test('an Area the registry no longer has reads as no Area', () => {
  const rows = concernRows(health('fault', [entity('light.a', 'Lampada', 'gone')]), areas);
  assert.equal(rows[0].areaName, NO_AREA);
});

test('rows run by Area name, then entity name, with no Area last', () => {
  const rows = concernRows(
    health('fault', [
      entity('light.z', 'Zeta', null),
      entity('light.s2', 'Spot', 'salone'),
      entity('light.s1', 'Applique', 'salone'),
      entity('light.c', 'Cappa', 'cucina'),
      entity('light.a', 'Abat-jour', null),
      entity('light.k', 'Comodino', 'camera_chri'),
    ]),
    areas
  );
  assert.deepEqual(
    rows.map(r => r.entity.name),
    ['Comodino', 'Cappa', 'Applique', 'Spot', 'Abat-jour', 'Zeta']
  );
});

test('an Area named after "Senza stanza" still sorts before the rows with none', () => {
  const rows = concernRows(health('fault', [entity('light.a', 'A', null), entity('light.b', 'B', 'z')]), [area('z', 'Zona Giorno')]);
  assert.deepEqual(
    rows.map(r => r.areaName),
    ['Zona Giorno', NO_AREA]
  );
});
