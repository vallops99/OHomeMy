/**
 * The Room Grid's sizing table (docs/protocol.md, "Groups and the Room
 * Grid") and what *Spegni tutto* turns off (#42).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Area, Entity } from '../ha';
import { lightsOn, roomGridShape } from './roomGrid';

test('the grid holds the protocol’s sizing table', () => {
  const cases: [number, { columns: number; rows: number }][] = [
    [1, { columns: 1, rows: 1 }],
    [2, { columns: 2, rows: 1 }],
    [3, { columns: 3, rows: 1 }],
    [4, { columns: 2, rows: 2 }],
    [5, { columns: 3, rows: 2 }],
    [6, { columns: 3, rows: 2 }],
    [7, { columns: 4, rows: 2 }],
    [8, { columns: 4, rows: 2 }],
    [9, { columns: 4, rows: 3 }],
    [13, { columns: 4, rows: 4 }],
  ];
  for (const [n, shape] of cases) assert.deepEqual(roomGridShape(n), shape, `${n} Areas`);
});

const entity = (id: string, state: string, areaId: string): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId,
  deviceId: null,
  labels: [],
  state,
  attributes: {},
  unavailable: state === 'unavailable',
});

const area = (id: string, ...entities: Entity[]): Area => ({ id, name: id, labels: [], icon: null, entities });

test('Spegni tutto targets every light that is on, in every Area of the grid', () => {
  const areas = [
    area('salone', entity('light.salone', 'on', 'salone'), entity('light.lampada', 'off', 'salone'), entity('switch.tv', 'on', 'salone')),
    area('cucina', entity('light.cucina', 'on', 'cucina'), entity('light.unreachable', 'unavailable', 'cucina')),
    area('camera', entity('sensor.t', '20', 'camera')),
  ];
  assert.deepEqual(
    lightsOn(areas).map(e => e.id),
    ['light.salone', 'light.cucina']
  );
});

test('Spegni tutto has nothing to target while no light is on', () => {
  assert.deepEqual(lightsOn([area('salone', entity('light.salone', 'off', 'salone'))]), []);
  assert.deepEqual(lightsOn([]), []);
});
