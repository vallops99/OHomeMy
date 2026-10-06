/**
 * Which of a Room Grid's chosen lights and temperatures each tile shows (#51).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Area, Entity } from '../../ha';
import { chosenIn } from './roomGrid';

const entity = (id: string, areaId: string): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId,
  deviceId: null,
  labels: [],
  state: 'off',
  attributes: {},
  unavailable: false,
});

const area = (id: string, ...entities: Entity[]): Area => ({ id, name: id, labels: [], icon: null, entities });

const salone = area('salone', entity('light.lampadario', 'salone'), entity('light.sala', 'salone'));
const cucina = area('cucina', entity('light.cucina', 'cucina'));

test('each tile takes the chosen entity that is in its Area', () => {
  const ids = ['light.cucina', 'light.sala'];
  assert.equal(chosenIn(salone, ids)?.id, 'light.sala');
  assert.equal(chosenIn(cucina, ids)?.id, 'light.cucina');
});

test('two chosen in one Area: the first in the list wins', () => {
  assert.equal(chosenIn(salone, ['light.sala', 'light.lampadario'])?.id, 'light.sala');
  assert.equal(chosenIn(salone, ['light.lampadario', 'light.sala'])?.id, 'light.lampadario');
});

test('an Area with none chosen gets none, never one picked for it', () => {
  assert.equal(chosenIn(salone, ['light.cucina']), null);
  assert.equal(chosenIn(salone, []), null);
});
