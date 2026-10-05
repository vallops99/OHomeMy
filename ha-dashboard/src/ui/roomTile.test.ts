/**
 * What a Room Tile says and offers (#42): which controls its `main` light
 * gets, whether it is lit, and its meta line.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Area, Entity } from '../ha';
import { roomTile } from './roomTile';

const DIMMABLE = { supported_color_modes: ['brightness'] };
const ONOFF = { supported_color_modes: ['onoff'] };

const entity = (id: string, state: string, attributes: Record<string, unknown> = {}, labels: string[] = []): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: 'salone',
  deviceId: null,
  labels,
  state,
  attributes,
  unavailable: state === 'unavailable',
});

const area = (...entities: Entity[]): Area => ({ id: 'salone', name: 'Soggiorno', labels: [], icon: null, entities });

test('a dimmable main light gets a switch and a dimmer', () => {
  assert.equal(roomTile(area(entity('light.salone', 'off', DIMMABLE, ['main']))).lights, 'dimmer');
});

test('an on/off main light gets a switch and no dimmer', () => {
  assert.equal(roomTile(area(entity('light.salone', 'off', ONOFF, ['main']))).lights, 'switch');
});

test('an Area with no light has no controls and says so', () => {
  const tile = roomTile(area(entity('sensor.t', '20', { device_class: 'temperature' })));
  assert.equal(tile.lights, 'none');
  assert.equal(tile.main, null);
  assert.equal(tile.lit, false);
  assert.equal(tile.meta, 'Nessuna luce collegata');
});

test('the main light is not counted beside the lights it stands for', () => {
  const tile = roomTile(
    area(
      entity('light.salone', 'off', DIMMABLE, ['main']),
      entity('light.a', 'off'),
      entity('light.b', 'off'),
      entity('light.c', 'off'),
      entity('light.d', 'off')
    )
  );
  assert.equal(tile.meta, 'Spente · 4 luci');
  assert.equal(tile.lit, false);
});

test('lights on are counted, in the plural and the singular', () => {
  const lights = (...states: string[]) => states.map((s, i) => entity(`light.l${i}`, s));
  const main = entity('light.salone', 'on', DIMMABLE, ['main']);
  assert.equal(roomTile(area(main, ...lights('on', 'on', 'on', 'on'))).meta, '4 luci accese');
  assert.equal(roomTile(area(main, ...lights('on', 'off', 'on', 'off'))).meta, '2 luci accese');
  assert.equal(roomTile(area(main, ...lights('on', 'off', 'off'))).meta, '1 luce accesa');
});

test('an Area whose only light is its main one reads Accesa or Spenta', () => {
  assert.equal(roomTile(area(entity('light.salone', 'on', DIMMABLE, ['main']))).meta, 'Accesa');
  assert.equal(roomTile(area(entity('light.salone', 'off', DIMMABLE, ['main']))).meta, 'Spenta');
});

test('a tile is lit while any of its lights is on', () => {
  const main = entity('light.salone', 'off', DIMMABLE, ['main']);
  assert.equal(roomTile(area(main, entity('light.a', 'on'), entity('light.b', 'off'))).lit, true);
  assert.equal(roomTile(area(entity('light.salone', 'on', DIMMABLE, ['main']))).lit, true);
});

test('the temperature follows the lights, after a middle dot', () => {
  const thermostat = entity('climate.t', 'heat', { current_temperature: 20.5 });
  assert.equal(roomTile(area(entity('light.salone', 'off', DIMMABLE, ['main']), thermostat)).meta, 'Spenta · 20,5°');
  assert.equal(roomTile(area(thermostat)).meta, 'Nessuna luce collegata · 20,5°');
});

test('an Unavailable main light is a fault, with no controls and no lit surface', () => {
  const tile = roomTile(area(entity('light.salone', 'unavailable', DIMMABLE, ['main']), entity('light.a', 'on')));
  assert.equal(tile.fault, true);
  assert.equal(tile.lit, false);
  assert.equal(tile.meta, 'Non disponibile');
});
