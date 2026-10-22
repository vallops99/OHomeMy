/**
 * What a Room Tile says and offers (#51): which controls its chosen light
 * gets, whether it is lit, its meta line, and its temperature.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Area, Entity } from '../../ha';
import type { Dashboard } from '../../document/types';
import { dashboardShows } from '../../document/shows';
import { lightFinder } from '../../ha/lights';
import { concernAt, dashboardConcerns } from '../../ha/verdict';
import { roomTileSchema } from './schema';
import { inArea, roomTile, temperatureReading } from './roomTile';

const DIMMABLE = { supported_color_modes: ['brightness'] };
const ONOFF = { supported_color_modes: ['onoff'] };

const entity = (id: string, state: string, attributes: Record<string, unknown> = {}): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: 'salone',
  deviceId: null,
  state,
  attributes,
  unavailable: state === 'unavailable',
});

const area = (...entities: Entity[]): Area => ({ id: 'salone', name: 'Soggiorno', icon: null, entities });

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

// ---- Lights counted light by light (#77) ----

test('a Light group counts as its three members on, not as 1 or 4', () => {
  const group = entity('light.cucina', 'on', { ...DIMMABLE, entity_id: ['light.a', 'light.b', 'light.c'] });
  const members = ['a', 'b', 'c'].map(n => entity(`light.${n}`, 'on'));
  assert.equal(roomTile(area(group, ...members), group, null).meta, '3 lights on');
});

test('a tile whose Area holds only a Light group counts members belonging to another Area', () => {
  const group = entity('light.cucina', 'on', { ...DIMMABLE, group_entities: ['light.a', 'light.b'] });
  const others = [entity('light.a', 'on'), entity('light.b', 'off')].map(e => ({ ...e, areaId: 'altra' }));
  const house = new Map(others.map(e => [e.id, e]));
  assert.equal(roomTile(area(group), group, null, id => house.get(id)).meta, '1 light on');
});

test('an Area with a single light, on, reads On', () => {
  const lamp = entity('light.lamp', 'on', ONOFF);
  assert.equal(roomTile(area(lamp), lamp, null).meta, 'On');
  assert.equal(roomTile(area(lamp), null, null).lit, true);
});

// ---- The tile's meta and the lit Concern count the same (#77) ----

const dashboardOfTile = (areaId: string, light: string | null): Dashboard => ({
  id: 'd',
  slug: 'd',
  name: 'D',
  show_in_sidebar: true,
  home_page: 'home',
  settings: {
    overflow: 'fit',
    supported_range: { min: { width: 1, height: 1 }, max: { width: 2, height: 2 } },
    idle_return: null,
    back_history: true,
    theme: { name: 'casa-panel', mode: 'follow-device' },
  },
  navbar: null,
  pages: [
    {
      id: 'home',
      name: 'home',
      popup: null,
      grid: { columns: 4, rows: 4 },
      widgets: [
        {
          id: 'w',
          kind: 'room_tile',
          x: 0,
          y: 0,
          w: 1,
          h: 1,
          variant: 'full',
          title: null,
          on_tap: null,
          settings: { area: areaId, light, temperature: null },
        },
      ],
    },
  ],
});

/** The count a tile's meta line states: "N lights on", "On", or none. */
const metaCount = (meta: string): number => (meta === 'On' ? 1 : Number(/^(\d+) lights? on/.exec(meta)?.[1] ?? 0));

const tileAndConcern = (house: Entity[], areaId: string, lightId: string | null) => {
  const shows = dashboardShows(dashboardOfTile(areaId, lightId), kind => (kind === 'room_tile' ? roomTileSchema : undefined));
  const tileArea: Area = { id: areaId, name: areaId, icon: null, entities: house.filter(e => e.areaId === areaId) };
  const meta = roomTile(tileArea, inArea(tileArea, lightId), null, lightFinder(house)).meta;
  const lit = concernAt(dashboardConcerns(house, shows), 'lit')?.entities.length ?? 0;
  return { meta: metaCount(meta), lit };
};

const inRoom = (areaId: string, e: Entity): Entity => ({ ...e, areaId });

test('a tile and the lit Concern count the same: a group beside its members', () => {
  const house = [
    inRoom('salone', entity('light.g', 'on', { ...DIMMABLE, entity_id: ['light.a', 'light.b'] })),
    inRoom('salone', entity('light.a', 'on')),
    inRoom('salone', entity('light.b', 'off')),
    inRoom('salone', entity('light.c', 'on')),
  ];
  assert.deepEqual(tileAndConcern(house, 'salone', 'light.g'), { meta: 2, lit: 2 });
});

test('a tile and the lit Concern count the same: an Area holding only a group whose members are elsewhere', () => {
  const house = [
    inRoom('salone', entity('light.g', 'on', { ...DIMMABLE, entity_id: ['light.a', 'light.b', 'light.c'] })),
    inRoom('altra', entity('light.a', 'on')),
    inRoom('altra', entity('light.b', 'on')),
    inRoom('altra', entity('light.c', 'off')),
  ];
  assert.deepEqual(tileAndConcern(house, 'salone', 'light.g'), { meta: 2, lit: 2 });
});

test('a tile and the lit Concern count the same: a single light, on', () => {
  const house = [inRoom('salone', entity('light.lamp', 'on', ONOFF))];
  assert.deepEqual(tileAndConcern(house, 'salone', 'light.lamp'), { meta: 1, lit: 1 });
});

test('an Unavailable member does not put the tile in its fault state', () => {
  const group = entity('light.g', 'on', { ...DIMMABLE, entity_id: ['light.a', 'light.b'] });
  const tile = roomTile(area(group, entity('light.a', 'on'), entity('light.b', 'unavailable')), group, null);
  assert.equal(tile.fault, false);
  assert.equal(tile.meta, '1 light on');
});
