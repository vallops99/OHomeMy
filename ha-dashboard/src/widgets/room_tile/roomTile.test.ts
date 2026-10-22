/**
 * What a Room Tile says and offers (#51): which controls its chosen light
 * gets, whether it is lit, its meta line, and its temperature.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Area, Entity } from '../../ha';
import { inArea, roomTile, temperatureReading } from './roomTile';

const DIMMABLE = { supported_color_modes: ['brightness'] };
const ONOFF = { supported_color_modes: ['onoff'] };

const entity = (id: string, state: string, attributes: Record<string, unknown> = {}): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: 'salone',
  deviceId: null,
  labels: [],
  state,
  attributes,
  unavailable: state === 'unavailable',
});

const area = (...entities: Entity[]): Area => ({ id: 'salone', name: 'Soggiorno', labels: [], icon: null, entities });

test('a dimmable chosen light gets a switch and a dimmer', () => {
  const light = entity('light.salone', 'off', DIMMABLE);
  assert.equal(roomTile(area(light), light, null).lights, 'dimmer');
});

test('an on/off chosen light gets a switch and no dimmer', () => {
  const light = entity('light.salone', 'off', ONOFF);
  assert.equal(roomTile(area(light), light, null).lights, 'switch');
});

test('with no light chosen there are no controls, and the tile says so', () => {
  const tile = roomTile(area(entity('light.a', 'off', DIMMABLE)), null, null);
  assert.equal(tile.lights, 'none');
  assert.equal(tile.light, null);
  assert.equal(tile.meta, 'No light chosen');
});

test('with no light chosen the tile is still lit while a light in the Area is on', () => {
  assert.equal(roomTile(area(entity('light.a', 'on')), null, null).lit, true);
  assert.equal(roomTile(area(entity('light.a', 'off')), null, null).lit, false);
});

test('a light group is not counted beside the lights it stands for', () => {
  const group = entity('light.luci_salone', 'off', { ...DIMMABLE, entity_id: ['light.a', 'light.b'] });
  const tile = roomTile(area(group, entity('light.a', 'off'), entity('light.b', 'off'), entity('light.c', 'off')), group, null);
  assert.equal(tile.meta, 'Off · 3 lights');
});

test('lights on are counted, in the plural and the singular', () => {
  const light = entity('light.salone', 'on', DIMMABLE);
  const others = (...states: string[]) => states.map((s, i) => entity(`light.l${i}`, s));
  assert.equal(roomTile(area(light, ...others('on', 'on', 'on')), light, null).meta, '4 lights on');
  assert.equal(roomTile(area(light, ...others('off', 'off')), light, null).meta, '1 light on');
});

test('an Area whose only light is the chosen one reads On or Off', () => {
  const on = entity('light.salone', 'on', DIMMABLE);
  const off = entity('light.salone', 'off', DIMMABLE);
  assert.equal(roomTile(area(on), on, null).meta, 'On');
  assert.equal(roomTile(area(off), off, null).meta, 'Off');
});

test("a chosen entity counts only while it is in the tile's Area", () => {
  const lamp = entity('light.salone', 'on', DIMMABLE);
  const elsewhere = { ...entity('light.cucina', 'on', DIMMABLE), areaId: 'cucina' };
  const salone = area(lamp);
  assert.equal(inArea(salone, 'light.salone'), lamp);
  assert.equal(inArea(salone, 'light.cucina'), null, 'in another Area');
  assert.equal(inArea(salone, 'light.gone'), null, 'gone from Home Assistant');
  assert.equal(inArea(salone, null), null);
  assert.equal(inArea({ ...salone, entities: [lamp, elsewhere] }, elsewhere.id), elsewhere);
});

test("a chosen light from outside the Area is not the tile's: no controls, nothing counted from it", () => {
  const elsewhere = { ...entity('light.cucina', 'on', DIMMABLE), areaId: 'cucina' };
  const salone = area(entity('light.salone', 'off', DIMMABLE));
  const tile = roomTile(salone, inArea(salone, elsewhere.id), null);
  assert.equal(tile.lights, 'none');
  assert.equal(tile.lit, false);
  assert.equal(tile.meta, 'No light chosen');
});

test('an Unavailable chosen light is a fault, and says only that', () => {
  const light = entity('light.salone', 'unavailable', DIMMABLE);
  const tile = roomTile(area(light, entity('light.a', 'on')), light, entity('climate.t', 'heat', { current_temperature: 20 }));
  assert.equal(tile.fault, true);
  assert.equal(tile.lit, false);
  assert.equal(tile.meta, 'Unavailable');
});

test('the temperature follows the lights, after a middle dot', () => {
  const light = entity('light.salone', 'off', DIMMABLE);
  const thermostat = entity('climate.t', 'heat', { current_temperature: 20.5 });
  assert.equal(roomTile(area(light), light, thermostat).meta, 'Off · 20.5°');
  assert.equal(roomTile(area(), null, thermostat).meta, 'No light chosen · 20.5°');
});

test('a thermostat reads its own current temperature, a sensor its state', () => {
  assert.equal(temperatureReading(entity('climate.t', 'heat', { current_temperature: 19 })), '19.0°');
  assert.equal(temperatureReading(entity('sensor.t', '21.46', { device_class: 'temperature' })), '21.5°');
});

test('a temperature that cannot be read is not shown', () => {
  assert.equal(temperatureReading(null), null);
  assert.equal(temperatureReading(entity('sensor.t', 'unavailable')), null);
  assert.equal(temperatureReading(entity('sensor.t', 'unknown')), null);
  assert.equal(temperatureReading(entity('climate.t', 'heat', {})), null);
  assert.equal(temperatureReading(entity('climate.t', 'unavailable', { current_temperature: 20 })), null);
});
