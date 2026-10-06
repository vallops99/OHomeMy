import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defineSchema, validateWidget } from '../document/schema';
import { controlsFor, moveItem, newWidget, sizeFor, withSetting, type HouseLists } from './inspector';

const house: HouseLists = {
  entities: [
    { id: 'light.salone', name: 'Salone', domain: 'light', areaId: 'salone' },
    { id: 'light.cucina', name: 'Cucina', domain: 'light', areaId: 'cucina' },
    { id: 'switch.fontana', name: 'Fontana', domain: 'switch', areaId: null },
    { id: 'lock.cancello', name: 'Cancello', domain: 'lock', areaId: 'esterno' },
    { id: 'sensor.power', name: 'Consumo', domain: 'sensor', areaId: null },
  ],
  areas: [
    { id: 'salone', name: 'Salone' },
    { id: 'cucina', name: 'Cucina' },
    { id: 'esterno', name: 'Esterno' },
  ],
};

const schema = defineSchema({
  kind: 'sample',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    light: { type: 'entity', domains: ['light', 'switch'] },
    power: { type: 'entity', domains: ['sensor'], optional: true },
    members: { type: 'entities', domains: ['light', 'switch', 'lock'], sameDomain: true },
    room: { type: 'area', optional: true },
    rooms: { type: 'areas', min: 0 },
    dim: { type: 'boolean', default: true },
    shape: { type: 'choice', options: ['row', 'block'], default: 'row' },
    count: { type: 'number', min: 1, max: 6, default: 3, integer: true },
    note: { type: 'text', optional: true, maxLength: 40 },
    icon: { type: 'icon', optional: true },
  },
});

const ICONS = ['mdi:home', 'mdi:sofa'];

const byKey = (settings: Record<string, unknown>) => Object.fromEntries(controlsFor(schema, settings, house, ICONS).map(c => [c.key, c]));

test("one control per setting, in the schema's order", () => {
  assert.deepEqual(
    controlsFor(schema, {}, house, ICONS).map(c => [c.key, c.type]),
    [
      ['light', 'entity'],
      ['power', 'entity'],
      ['members', 'entities'],
      ['room', 'area'],
      ['rooms', 'areas'],
      ['dim', 'boolean'],
      ['shape', 'choice'],
      ['count', 'number'],
      ['note', 'text'],
      ['icon', 'icon'],
    ]
  );
});

test('an entity picker offers only its Domains, by Area then name', () => {
  const c = byKey({}).light;
  assert.equal(c.type, 'entity');
  if (c.type !== 'entity') return;
  assert.deepEqual(
    c.options.map(o => o.value),
    ['light.cucina', 'light.salone', 'switch.fontana']
  );
  assert.equal(c.options[0].detail, 'Cucina · light.cucina');
  assert.equal(c.value, null);
  assert.equal(c.optional, false);
  const power = byKey({}).power;
  assert.equal(power.type === 'entity' && power.optional, true);
});

test('a value the house no longer has is still listed, marked missing', () => {
  const c = byKey({ light: 'light.gone' }).light;
  assert.ok(c.type === 'entity');
  assert.deepEqual(c.options[0], { value: 'light.gone', label: 'light.gone', missing: true });
  assert.equal(c.value, 'light.gone');
});

test('a list offers what is not chosen yet, and a Group only the Domain of its first member', () => {
  const empty = byKey({}).members;
  assert.ok(empty.type === 'entities');
  assert.equal(empty.options.length, 4);
  const one = byKey({ members: ['light.salone'] }).members;
  assert.ok(one.type === 'entities');
  assert.deepEqual(
    one.chosen.map(o => o.value),
    ['light.salone']
  );
  assert.deepEqual(
    one.options.map(o => o.value),
    ['light.cucina']
  );
  assert.equal(one.min, 1);
});

test("Area pickers list the house's Areas by name", () => {
  const c = byKey({ rooms: ['cucina'] });
  assert.ok(c.room.type === 'area' && c.rooms.type === 'areas');
  assert.deepEqual(
    c.room.options.map(o => o.label),
    ['Cucina', 'Esterno', 'Salone']
  );
  assert.deepEqual(
    c.rooms.options.map(o => o.value),
    ['esterno', 'salone']
  );
  assert.equal(c.rooms.min, 0);
});

test('switches, choices and numbers read their defaults until set', () => {
  const unset = byKey({});
  assert.ok(unset.dim.type === 'boolean' && unset.shape.type === 'choice' && unset.count.type === 'number');
  assert.equal(unset.dim.value, true);
  assert.equal(unset.shape.value, 'row');
  assert.deepEqual(
    unset.shape.options.map(o => o.value),
    ['row', 'block']
  );
  assert.deepEqual([unset.count.value, unset.count.min, unset.count.max, unset.count.step], [3, 1, 6, 1]);
  const set = byKey({ dim: false, shape: 'block', count: 5 });
  assert.deepEqual([set.dim.type === 'boolean' && set.dim.value, set.shape.type === 'choice' && set.shape.value], [false, 'block']);
});

test('text keeps its length limit, and icons are the ones Casa Panel draws', () => {
  const c = byKey({ icon: 'mdi:sofa' });
  assert.ok(c.note.type === 'text' && c.icon.type === 'icon');
  assert.equal(c.note.maxLength, 40);
  assert.deepEqual(
    c.icon.options.map(o => o.value),
    ICONS
  );
  assert.equal(c.icon.value, 'mdi:sofa');
});

test('setting a field to none removes it from the settings', () => {
  assert.deepEqual(withSetting({ a: 1 }, 'b', 2), { a: 1, b: 2 });
  assert.deepEqual(withSetting({ a: 1, b: 2 }, 'b', null), { a: 1 });
});

test('choices made through the controls make a valid Widget', () => {
  const w = newWidget(schema, 'w1', { x: 0, y: 0, ...sizeFor('sample') });
  let settings = w.settings;
  assert.equal(validateWidget({ ...w, settings }, schema).ok, false, 'a required entity is not chosen yet');
  for (const c of controlsFor(schema, settings, house, ICONS)) {
    if (c.type === 'entity' && !c.optional) settings = withSetting(settings, c.key, c.options[0].value);
    if (c.type === 'entities') settings = withSetting(settings, c.key, [c.options[0].value]);
  }
  const second = byKey(settings).members;
  assert.ok(second.type === 'entities');
  settings = withSetting(settings, 'members', [...second.value, second.options[0].value]);
  assert.equal(validateWidget({ ...w, settings }, schema).ok, true);
});

test("a new Widget is its kind's first Variant, untitled, opening nothing, with empty lists and nothing chosen", () => {
  assert.deepEqual(newWidget(schema, 'w1', { x: 1, y: 2, w: 3, h: 1 }), {
    id: 'w1',
    kind: 'sample',
    x: 1,
    y: 2,
    w: 3,
    h: 1,
    variant: 'full',
    title: null,
    on_tap: null,
    // A list, even one that may be empty, must be there to be valid.
    settings: { members: [], rooms: [] },
  });
  assert.deepEqual(sizeFor('clock'), { w: 4, h: 1 });
  assert.deepEqual(sizeFor('room_tile_from_the_future'), { w: 3, h: 2 });
});

test('a list item moves one place, within the list', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, -1), ['a', 'c', 'b']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c']);
});
