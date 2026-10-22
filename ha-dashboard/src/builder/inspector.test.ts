import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defineSchema, validateWidget } from '../document/schema';
import {
  controlsFor,
  domainFilter,
  houseModeOptions,
  changeSetting,
  memberKeys,
  membersSetting,
  moveAreaMember,
  moveItem,
  moveMember,
  newWidget,
  removeAreaMember,
  removeMember,
  retiredLists,
  sizeFor,
  titleControl,
  tileOptions,
  updateAreaMember,
  updateMember,
  withAreaIds,
  withMemberIds,
  withoutRetiredLists,
  withSetting,
  type HouseLists,
} from './inspector';
import { groupSchema as realGroupSchema } from '../widgets/group/schema';

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
    members: { type: 'entities', domains: ['light', 'switch', 'lock'] },
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

test('a list offers what is not chosen yet, of every Domain it takes', () => {
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
    ['light.cucina', 'lock.cancello', 'switch.fontana']
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

test('the house entity for follow-house is offered from suns, binary sensors and booleans only (#70)', () => {
  const entities = [
    { id: 'sun.sun', name: 'Sun' },
    { id: 'binary_sensor.dark_outside', name: 'Dark outside' },
    { id: 'input_boolean.night', name: 'Night' },
    { id: 'sensor.lux', name: 'Lux' },
    { id: 'light.kitchen', name: 'Kitchen' },
  ];
  const options = houseModeOptions(entities, 'sun.sun');
  assert.deepEqual(options.map(o => o.value).sort(), ['binary_sensor.dark_outside', 'input_boolean.night', 'sun.sun']);
  assert.ok(options.every(o => !o.missing));
  const gone = houseModeOptions(entities, 'binary_sensor.removed');
  assert.deepEqual(gone[0], { value: 'binary_sensor.removed', label: 'binary_sensor.removed', missing: true });
});

const groupSchema = defineSchema({
  kind: 'group',
  variants: ['full', 'compact'],
  titled: true,
  settings: { members: { type: 'members', domains: ['light', 'switch', 'lock'], variantDomains: ['light', 'switch'] } },
});
const unset = (entity: string) => ({ entity, name: null, variant: null, on_tap: null });

test('a Group saved before Members lists its members as Members with nothing set', () => {
  const [c] = controlsFor(groupSchema, { members: ['light.salone', 'light.gone'] }, house, ICONS);
  assert.equal(c.type, 'members');
  if (c.type !== 'members') return;
  assert.deepEqual(c.value, [unset('light.salone'), unset('light.gone')]);
  assert.deepEqual(
    c.chosen.map(o => [o.value, !!o.missing]),
    [
      ['light.salone', false],
      ['light.gone', true],
    ]
  );
  assert.deepEqual(
    c.options.map(o => o.value),
    ['light.cucina', 'lock.cancello', 'switch.fontana'],
    'every Domain, not yet chosen'
  );
});

test('a Group with a thermostat still offers its humidity, and takes it (ADR-0017)', () => {
  const hallway: HouseLists = {
    entities: [
      { id: 'climate.corridoio_termostato', name: 'Termostato', domain: 'climate', areaId: null },
      { id: 'sensor.corridoio_termostato_umidita', name: 'Umidità', domain: 'sensor', areaId: null },
      { id: 'light.corridoio', name: 'Corridoio', domain: 'light', areaId: null },
      { id: 'camera.porta', name: 'Porta', domain: 'camera', areaId: null },
    ],
    areas: [],
  };
  const settings = { members: [unset('climate.corridoio_termostato')] };
  const [c] = controlsFor(realGroupSchema, settings, hallway, ICONS);
  assert.ok(c.type === 'members');
  assert.deepEqual(
    c.options.map(o => o.value),
    ['light.corridoio', 'sensor.corridoio_termostato_umidita']
  );
  const members = withMemberIds(c.value, [...c.value.map(m => m.entity), 'sensor.corridoio_termostato_umidita']);
  const w = { ...newWidget(realGroupSchema, 'g', { x: 0, y: 0, w: 4, h: 3 }), settings: { members } };
  const v = validateWidget(w, realGroupSchema);
  assert.equal(v.ok, true);
  if (v.ok)
    assert.deepEqual(
      (v.settings.members as { entity: string }[]).map(m => m.entity),
      ['climate.corridoio_termostato', 'sensor.corridoio_termostato_umidita']
    );
});

test('the Domain filter offers only Domains with something left to add, and narrows the picker', () => {
  const options = [
    { value: 'light.a', label: 'A' },
    { value: 'sensor.b', label: 'B' },
    { value: 'light.c', label: 'C' },
  ];
  const all = domainFilter(options, null);
  assert.deepEqual(all.domains, ['light', 'sensor']);
  assert.equal(all.picked, null, 'All by default');
  assert.equal(all.options, options);
  const lights = domainFilter(options, 'light');
  assert.equal(lights.picked, 'light');
  assert.deepEqual(
    lights.options.map(o => o.value),
    ['light.a', 'light.c']
  );
});

test('the Domain filter falls back to All once its Domain runs out, and is not offered for one Domain', () => {
  const sensors = [{ value: 'sensor.b', label: 'B' }];
  const ranOut = domainFilter([...sensors, { value: 'lock.d', label: 'D' }], 'light');
  assert.equal(ranOut.picked, null);
  assert.equal(ranOut.options.length, 2);
  assert.deepEqual(domainFilter(sensors, 'sensor').domains, [], 'one Domain left: no filter');
  assert.equal(domainFilter(sensors, 'sensor').picked, null);
  assert.deepEqual(domainFilter([], null), { domains: [], picked: null, options: [] });
});

test("a Group's title is a plain text field; other titled Widgets keep Default or Own", () => {
  assert.equal(titleControl(realGroupSchema), 'text');
  assert.equal(titleControl(schema), 'default-or-own');
  assert.equal(titleControl({ ...schema, titled: false }), null);
});

test('the list keeps each Member’s settings, and writes every Member in full', () => {
  const kept = { entity: 'light.salone', name: 'Divano', variant: 'compact', on_tap: 'rooms' } as const;
  assert.deepEqual(withMemberIds([kept, 'light.cucina'], ['light.cucina', 'light.salone', 'light.new']), [
    unset('light.cucina'),
    kept,
    unset('light.new'),
  ]);
});

test('a Member is changed, moved and removed by its entity, and the rest are written in full', () => {
  const members = ['light.a', { entity: 'light.b', name: 'B', variant: null, on_tap: null }, 'light.c'];
  assert.deepEqual(updateMember(members, 'light.a', { name: 'A', variant: 'full' }), [
    { ...unset('light.a'), name: 'A', variant: 'full' },
    { ...unset('light.b'), name: 'B' },
    unset('light.c'),
  ]);
  assert.deepEqual(
    moveMember(members, 'light.c', -1).map(m => m.entity),
    ['light.a', 'light.c', 'light.b']
  );
  assert.deepEqual(
    moveMember(members, 'light.a', -1).map(m => m.entity),
    ['light.a', 'light.b', 'light.c']
  );
  assert.deepEqual(
    removeMember(members, 'light.b').map(m => m.entity),
    ['light.a', 'light.c']
  );
});

test('the settings key that holds Members, if the kind has one', () => {
  assert.equal(membersSetting(groupSchema)?.key, 'members');
  assert.equal(membersSetting(tileSchemaPlain), null);
});

test('a new Group starts with no Members', () => {
  assert.deepEqual(newWidget(groupSchema, 'g', { x: 0, y: 0, w: 4, h: 3 }).settings, { members: [] });
});

test("a Room Grid's Areas are listed with each one's tap", () => {
  const c = byKey({ rooms: ['cucina', { area: 'salone', on_tap: 'climate' }] }).rooms;
  assert.ok(c.type === 'areas');
  assert.deepEqual(c.value, [
    { area: 'cucina', light: null, temperature: null, on_tap: null },
    { area: 'salone', light: null, temperature: null, on_tap: 'climate' },
  ]);
  assert.deepEqual(
    c.chosen.map(o => o.label),
    ['Cucina', 'Salone']
  );
});

test("an Area's tap is kept as the list is reordered, and set or cleared on its own", () => {
  const raw = ['cucina', { area: 'salone', on_tap: 'climate' }];
  assert.deepEqual(withAreaIds(raw, ['salone', 'esterno']), [
    { area: 'salone', light: null, temperature: null, on_tap: 'climate' },
    { area: 'esterno', light: null, temperature: null, on_tap: null },
  ]);
  assert.deepEqual(updateAreaMember(raw, 'cucina', { on_tap: 'home' }), [
    { area: 'cucina', light: null, temperature: null, on_tap: 'home' },
    { area: 'salone', light: null, temperature: null, on_tap: 'climate' },
  ]);
  assert.deepEqual(updateAreaMember(raw, 'salone', { on_tap: null }), [
    { area: 'cucina', light: null, temperature: null, on_tap: null },
    { area: 'salone', light: null, temperature: null, on_tap: null },
  ]);
});

const gridSchema = defineSchema({
  kind: 'grid',
  variants: ['full'],
  titled: false,
  settings: { areas: { type: 'areas', min: 0 } },
});

const tileSchemaPlain = defineSchema({
  kind: 'plain',
  variants: ['full'],
  titled: false,
  settings: { dim: { type: 'boolean', default: true } },
});

test('the settings key and type of the Members: a Group’s entities or a Room Grid’s Areas', () => {
  assert.deepEqual(membersSetting(groupSchema), { key: 'members', type: 'members' });
  assert.deepEqual(membersSetting(gridSchema), { key: 'areas', type: 'areas' });
  assert.equal(membersSetting(tileSchemaPlain), null);
  assert.equal(membersSetting(gridSchema)?.key, 'areas');
});

test('the Member keys, in order: entity ids for a Group, Area ids for a Room Grid', () => {
  assert.deepEqual(memberKeys(gridSchema, { areas: ['cucina', { area: 'salone', on_tap: null }] }), ['cucina', 'salone']);
  assert.deepEqual(memberKeys(groupSchema, { members: ['light.a', { entity: 'light.b' }] }), ['light.a', 'light.b']);
  assert.deepEqual(memberKeys(tileSchemaPlain, {}), []);
  assert.deepEqual(memberKeys(gridSchema, {}), []);
});

test("an Area is moved and removed as a Group's Member is, keeping the others' choices", () => {
  const raw = ['cucina', { area: 'salone', light: 'light.salone', on_tap: 'home' }, 'esterno'];
  assert.deepEqual(
    moveAreaMember(raw, 'salone', -1).map(m => m.area),
    ['salone', 'cucina', 'esterno']
  );
  assert.deepEqual(moveAreaMember(raw, 'salone', 1)[2], { area: 'salone', light: 'light.salone', temperature: null, on_tap: 'home' });
  assert.deepEqual(
    moveAreaMember(raw, 'cucina', -1).map(m => m.area),
    ['cucina', 'salone', 'esterno']
  );
  assert.deepEqual(
    removeAreaMember(raw, 'salone').map(m => m.area),
    ['cucina', 'esterno']
  );
  assert.deepEqual(updateAreaMember(raw, 'salone', { temperature: 'sensor.t', light: null })[1], {
    area: 'salone',
    light: null,
    temperature: 'sensor.t',
    on_tap: 'home',
  });
});

const tileHouse: HouseLists = {
  entities: [
    { id: 'light.luci_salone', name: 'Luci salone', domain: 'light', areaId: 'salone' },
    { id: 'light.divano', name: 'Divano', domain: 'light', areaId: 'salone' },
    { id: 'light.luci_cucina', name: 'Luci cucina', domain: 'light', areaId: 'cucina' },
    { id: 'switch.salone', name: 'Presa', domain: 'switch', areaId: 'salone' },
    { id: 'light.senza_area', name: 'Senza area', domain: 'light', areaId: null },
  ],
  areas: house.areas,
};

test('a tile’s light is chosen among the lights in its own Area only', () => {
  const options = tileOptions(tileHouse, 'salone', ['light'], null);
  assert.deepEqual(options.map(o => o.value).sort(), ['light.divano', 'light.luci_salone']);
  assert.ok(options.every(o => !o.missing && !o.elsewhere));
  assert.deepEqual(tileOptions(tileHouse, null, ['light'], null), [], 'no Area, nothing to choose from');
});

test('a chosen one in another Area stays listed and selected, marked as not in this Area', () => {
  const options = tileOptions(tileHouse, 'salone', ['light'], 'light.luci_cucina');
  assert.deepEqual(options[0], { value: 'light.luci_cucina', label: 'Luci cucina', detail: 'Cucina · light.luci_cucina', elsewhere: true });
  assert.equal(options.length, 3);
  const none = tileOptions(tileHouse, 'salone', ['light'], 'light.senza_area');
  assert.equal(none[0].elsewhere, true);
});

test('a chosen one Home Assistant no longer has is listed too, marked missing and not in this Area', () => {
  const options = tileOptions(tileHouse, 'salone', ['light'], 'light.gone');
  assert.deepEqual(options[0], { value: 'light.gone', label: 'light.gone', missing: true, elsewhere: true });
});

const tileSchema = defineSchema({
  kind: 'tile',
  variants: ['full'],
  titled: true,
  settings: {
    area: { type: 'area' },
    light: { type: 'entity', domains: ['light'], optional: true, inArea: 'area' },
    temperature: { type: 'entity', domains: ['climate', 'sensor'], optional: true, inArea: 'area' },
  },
});

test('a Room Tile Widget’s light picker offers only its Area’s lights, and keeps a chosen one from elsewhere', () => {
  const light = (settings: Record<string, unknown>) => {
    const c = controlsFor(tileSchema, settings, tileHouse, ICONS).find(c => c.key === 'light')!;
    assert.ok(c.type === 'entity');
    return c.options;
  };
  assert.deepEqual(
    light({ area: 'salone' })
      .map(o => o.value)
      .sort(),
    ['light.divano', 'light.luci_salone']
  );
  const kept = light({ area: 'salone', light: 'light.luci_cucina' });
  assert.equal(kept[0].value, 'light.luci_cucina');
  assert.equal(kept[0].elsewhere, true);
});

test('changing a Room Tile Widget’s Area clears its light and temperature in the same edit', () => {
  const settings = { area: 'salone', light: 'light.luci_salone', temperature: 'sensor.t' };
  assert.deepEqual(changeSetting(tileSchema, settings, 'area', 'cucina'), { area: 'cucina' });
  assert.deepEqual(changeSetting(tileSchema, settings, 'area', 'salone'), settings, 'the same Area changes nothing');
  assert.deepEqual(changeSetting(tileSchema, settings, 'light', null), { area: 'salone', temperature: 'sensor.t' });
  assert.deepEqual(changeSetting(tileSchema, { area: 'salone' }, 'area', 'cucina'), { area: 'cucina' });
});

test('the old light and temperature lists a Room Grid no longer takes, and their removal', () => {
  const settings = { areas: [{ area: 'salone', on_tap: 'home' }], lights: ['light.a'], temperatures: [] };
  assert.deepEqual(retiredLists(gridSchema, settings), ['lights', 'temperatures']);
  assert.deepEqual(retiredLists(gridSchema, { areas: [] }), []);
  assert.deepEqual(retiredLists(tileSchema, { lights: [] }), ['lights']);
  assert.deepEqual(withoutRetiredLists(gridSchema, settings), { areas: [{ area: 'salone', on_tap: 'home' }] });
  assert.equal(
    validateWidget({ id: 'g', kind: 'grid', x: 0, y: 0, w: 1, h: 1, variant: 'full', title: null, on_tap: null, settings }, gridSchema).ok,
    false
  );
});
