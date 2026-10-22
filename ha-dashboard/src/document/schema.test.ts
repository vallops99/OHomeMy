/**
 * The shared schema module (#50): which Widgets the renderer shows and the
 * Builder offers.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defineSchema, fitsGrid, inSupportedRange, shownTitle, validateWidget, type House } from './schema';
import { groupSchema } from '../widgets/group/schema';
import type { Widget } from './types';

const schema = defineSchema({
  kind: 'sample',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    light: { type: 'entity', domains: ['light', 'switch'] },
    sensor: { type: 'entity', domains: [], optional: true },
    room: { type: 'area', optional: true },
    cameras: { type: 'entities', domains: ['camera'], min: 0 },
    dimmer: { type: 'boolean', default: true },
    shape: { type: 'choice', options: ['row', 'block'], default: 'row' },
    columns: { type: 'number', min: 1, max: 4, default: 2, integer: true },
    note: { type: 'text', optional: true },
    icon: { type: 'icon', optional: true },
  },
});

const widget = (overrides: Partial<Widget> = {}): Widget => ({
  id: 'w',
  kind: 'sample',
  x: 0,
  y: 0,
  w: 2,
  h: 1,
  variant: 'full',
  title: null,
  on_tap: null,
  settings: { light: 'light.salone' },
  ...overrides,
});

const house: House = {
  hasEntity: id => ['light.salone', 'camera.ingresso', 'sensor.t'].includes(id),
  hasArea: id => id === 'salone',
};

const sound = (settings: Record<string, unknown> = {}) => widget({ settings: { light: 'light.salone', cameras: [], ...settings } });

test('a sound Widget reads with its defaults filled in', () => {
  assert.deepEqual(validateWidget(sound(), schema), {
    ok: true,
    settings: {
      light: 'light.salone',
      sensor: null,
      room: null,
      cameras: [],
      dimmer: true,
      shape: 'row',
      columns: 2,
      note: null,
      icon: null,
    },
  });
});

test('a list setting must be given, even one that may be empty', () => {
  assert.match(reason(validateWidget(widget(), schema)), /cameras: not a list/);
});

test('an unknown kind, or a Variant the kind lacks, is invalid', () => {
  assert.match(reason(validateWidget(sound(), undefined)), /unknown kind/);
  const oneForm = defineSchema({ kind: 'one', variants: ['full'], titled: false, settings: {} });
  assert.match(reason(validateWidget(widget({ variant: 'compact', settings: {} }), oneForm)), /no compact variant/);
});

test('a setting the kind does not have is invalid', () => {
  assert.match(reason(validateWidget(sound({ colour: 'red' }), schema)), /unknown setting "colour"/);
});

test('each field type checks its value', () => {
  const bad: [Record<string, unknown>, RegExp][] = [
    [{ light: undefined }, /light: required/],
    [{ light: 'lock.gate' }, /light: lock.gate is not a light or switch/],
    [{ light: 'Light.Salone' }, /light: not an entity id/],
    [{ room: 'Salone!' }, /room: not an Area id/],
    [{ cameras: 'camera.x' }, /cameras: not a list/],
    [{ cameras: ['camera.a', 'camera.a'] }, /cameras: camera.a twice/],
    [{ cameras: ['light.a'] }, /cameras: light.a is not a camera/],
    [{ dimmer: 'yes' }, /dimmer: not true or false/],
    [{ shape: 'circle' }, /shape: not one of row, block/],
    [{ columns: 5 }, /columns: not between 1 and 4/],
    [{ columns: 1.5 }, /columns: not a whole number/],
    [{ note: 3 }, /note: not text/],
    [{ note: 'x'.repeat(201) }, /note: too long/],
    [{ icon: 'sofa' }, /icon: not an icon name/],
  ];
  for (const [settings, expected] of bad) assert.match(reason(validateWidget(sound(settings), schema)), expected, JSON.stringify(settings));
});

test('any Domain is allowed when a field names none', () => {
  assert.equal(validateWidget(sound({ sensor: 'weather.home' }), schema).ok, true);
});

test('settings must be an object', () => {
  assert.match(reason(validateWidget(widget({ settings: [] as unknown as Record<string, unknown> }), schema)), /not an object/);
});

test('with the house, a missing required entity takes the Widget with it', () => {
  assert.match(reason(validateWidget(sound({ light: 'light.gone' }), schema, { house })), /light.gone is not in Home Assistant/);
});

test('with the house, a missing optional one reads as unset and missing members are dropped', () => {
  const v = validateWidget(sound({ sensor: 'sensor.gone', room: 'cucina', cameras: ['camera.gone', 'camera.ingresso'] }), schema, {
    house,
  });
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.equal(v.settings.sensor, null);
  assert.equal(v.settings.room, null);
  assert.deepEqual(v.settings.cameras, ['camera.ingresso']);
});

test('a list left shorter than its minimum is invalid', () => {
  const needsOne = defineSchema({
    kind: 'wall',
    variants: ['full'],
    titled: true,
    settings: { cameras: { type: 'entities', domains: ['camera'] } },
  });
  const w = widget({ kind: 'wall', settings: { cameras: ['camera.gone'] } });
  assert.equal(validateWidget(w, needsOne).ok, true);
  assert.match(reason(validateWidget(w, needsOne, { house })), /cameras: fewer than 1/);
});

test('a Group mixes Domains freely, but never takes a camera (ADR-0017)', () => {
  const w = (members: string[]) => widget({ kind: 'group', settings: { members } });
  const thermostat = ['climate.corridoio_termostato', 'sensor.corridoio_termostato_umidita', 'light.corridoio'];
  const v = validateWidget(w(thermostat), groupSchema);
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.deepEqual(
    (v.settings.members as { entity: string }[]).map(m => m.entity),
    thermostat
  );
  assert.match(reason(validateWidget(w(['light.a', 'camera.porta']), groupSchema)), /members:/);
});

const groupOf = defineSchema({
  kind: 'group',
  variants: ['full', 'compact'],
  titled: true,
  settings: { members: { type: 'members', domains: ['light', 'lock', 'sensor'], variantDomains: ['light', 'sensor'] } },
});
const grouped = (members: unknown[]) => widget({ kind: 'group', settings: { members } });
const unset = (entity: string) => ({ entity, name: null, variant: null, on_tap: null });

test('a Group saved before Members reads each plain id as a Member with nothing set', () => {
  const v = validateWidget(grouped(['light.a', 'light.b']), groupOf);
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.deepEqual(v.settings.members, [unset('light.a'), unset('light.b')]);
});

test('a Member reads with its name, Variant and tap', () => {
  const member = { entity: 'light.a', name: 'Sopra il tavolo', variant: 'compact', on_tap: 'rooms' };
  const v = validateWidget(grouped([member, 'light.b']), groupOf);
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.deepEqual(v.settings.members, [member, unset('light.b')]);
});

test('an empty name is unset, and a Variant on a Domain with one form is ignored', () => {
  const v = validateWidget(grouped([{ entity: 'lock.a', name: '', variant: 'compact', on_tap: null }]), groupOf);
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.deepEqual(v.settings.members, [unset('lock.a')]);
});

test('a Member must be well formed', () => {
  assert.match(reason(validateWidget(grouped([{ entity: 'light' }]), groupOf)), /members: not an entity id/);
  assert.match(reason(validateWidget(grouped([{ ...unset('light.a'), name: 3 }]), groupOf)), /members: not text/);
  assert.match(reason(validateWidget(grouped([{ ...unset('light.a'), variant: 'tiny' }]), groupOf)), /members: not one of full, compact/);
  assert.match(reason(validateWidget(grouped([{ ...unset('light.a'), on_tap: 7 }]), groupOf)), /members: not text/);
  assert.match(reason(validateWidget(grouped([{ ...unset('light.a'), colour: 'red' }]), groupOf)), /members: unknown setting "colour"/);
  assert.match(reason(validateWidget(grouped([42]), groupOf)), /members: not an entity id/);
  assert.match(reason(validateWidget(grouped({} as unknown as unknown[]), groupOf)), /members: not a list/);
});

test("Members keep the list's rules: Domains, no duplicates, dropped when gone, a minimum", () => {
  assert.match(reason(validateWidget(grouped(['switch.a']), groupOf)), /members: switch.a/);
  assert.match(reason(validateWidget(grouped(['light.a', unset('light.a')]), groupOf)), /members: light.a twice/);
  const one: House = { hasEntity: id => id === 'light.a', hasArea: () => false };
  const v = validateWidget(grouped([unset('light.gone'), { ...unset('light.a'), name: 'A' }]), groupOf, { house: one });
  assert.equal(v.ok, true);
  if (v.ok) assert.deepEqual(v.settings.members, [{ ...unset('light.a'), name: 'A' }]);
  assert.match(reason(validateWidget(grouped(['light.gone']), groupOf, { house: one })), /members: fewer than 1/);
});

test('the grid: inside the columns always, inside the rows only when the Dashboard fits', () => {
  const fit = { columns: 12, rows: 8, overflow: 'fit' } as const;
  const scroll = { ...fit, overflow: 'scroll' } as const;
  assert.equal(fitsGrid({ x: 10, y: 7, w: 2, h: 1 }, fit), true);
  assert.equal(fitsGrid({ x: 11, y: 0, w: 2, h: 1 }, fit), false);
  assert.equal(fitsGrid({ x: 0, y: 7, w: 1, h: 2 }, fit), false);
  assert.equal(fitsGrid({ x: 0, y: 7, w: 1, h: 2 }, scroll), true);
  assert.equal(fitsGrid({ x: -1, y: 0, w: 1, h: 1 }, scroll), false);
  assert.equal(fitsGrid({ x: 0, y: 0, w: 0, h: 1 }, scroll), false);
  assert.equal(fitsGrid({ x: 0.5, y: 0, w: 1, h: 1 }, scroll), false);
  assert.match(reason(validateWidget(sound(), schema, { grid: { columns: 1, rows: 1, overflow: 'fit' } })), /outside the grid/);
});

test('a title: as written when set, even empty; the Default title while unset', () => {
  assert.equal(shownTitle(null, 'Clock'), 'Clock');
  assert.equal(shownTitle('Ora', 'Clock'), 'Ora');
  assert.equal(shownTitle('', 'Clock'), '');
});

test('the supported range includes its ends', () => {
  const range = { min: { width: 1024, height: 600 }, max: { width: 1280, height: 800 } };
  assert.equal(inSupportedRange({ width: 1024, height: 600 }, range), true);
  assert.equal(inSupportedRange({ width: 1280, height: 800 }, range), true);
  assert.equal(inSupportedRange({ width: 1281, height: 800 }, range), false);
  assert.equal(inSupportedRange({ width: 1100, height: 599 }, range), false);
});

function reason(v: { ok: boolean; reason?: string }): string {
  assert.equal(v.ok, false, 'expected the Widget to be invalid');
  return v.reason ?? '';
}

const gridOf = defineSchema({
  kind: 'room_grid',
  variants: ['full'],
  titled: true,
  settings: { areas: { type: 'areas' } },
});
const grid = (areas: unknown[]) => widget({ kind: 'room_grid', settings: { areas } });

test('a Room Grid saved before its Areas were Members reads each plain id as a Member with no tap', () => {
  const v = validateWidget(grid(['salone', 'cucina']), gridOf);
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.deepEqual(v.settings.areas, [
    { area: 'salone', light: null, temperature: null, on_tap: null },
    { area: 'cucina', light: null, temperature: null, on_tap: null },
  ]);
});

test("a Room Grid's Member reads with its tap, beside plain ids", () => {
  const v = validateWidget(grid([{ area: 'salone', on_tap: 'rooms' }, 'cucina', { area: 'bagno' }]), gridOf);
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.deepEqual(v.settings.areas, [
    { area: 'salone', light: null, temperature: null, on_tap: 'rooms' },
    { area: 'cucina', light: null, temperature: null, on_tap: null },
    { area: 'bagno', light: null, temperature: null, on_tap: null },
  ]);
});

test("a Room Grid's Member reads its light and temperature, each optional", () => {
  const v = validateWidget(
    grid([
      { area: 'salone', light: 'light.sala', temperature: 'climate.t', on_tap: 'rooms' },
      { area: 'cucina', light: 'light.cucina' },
      { area: 'bagno', temperature: 'sensor.bagno_t', light: null },
    ]),
    gridOf
  );
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.deepEqual(v.settings.areas, [
    { area: 'salone', light: 'light.sala', temperature: 'climate.t', on_tap: 'rooms' },
    { area: 'cucina', light: 'light.cucina', temperature: null, on_tap: null },
    { area: 'bagno', light: null, temperature: 'sensor.bagno_t', on_tap: null },
  ]);
});

test("a Room Grid's Member light is a light, its temperature a thermostat or sensor", () => {
  assert.match(reason(validateWidget(grid([{ area: 'salone', light: 'switch.sala' }]), gridOf)), /areas: .*light/);
  assert.match(reason(validateWidget(grid([{ area: 'salone', light: 'sala' }]), gridOf)), /areas: not an entity/);
  assert.match(reason(validateWidget(grid([{ area: 'salone', temperature: 'light.sala' }]), gridOf)), /areas: .*climate or sensor/);
  assert.match(reason(validateWidget(grid([{ area: 'salone', temperature: 7 }]), gridOf)), /areas: not an entity/);
});

test("a Room Grid's Member keeps a light that is not in the house; the tile decides", () => {
  const none: House = { hasEntity: () => false, hasArea: () => true };
  const v = validateWidget(grid([{ area: 'salone', light: 'light.gone' }]), gridOf, { house: none });
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.settings.areas[0].light, 'light.gone');
});

test("a Room Grid's Member must be well formed, and keeps the list's rules", () => {
  assert.match(reason(validateWidget(grid([{ area: 'salone', name: 'Sala' }]), gridOf)), /areas: unknown setting "name"/);
  assert.match(reason(validateWidget(grid([{ area: 'salone', on_tap: 7 }]), gridOf)), /areas: not text/);
  assert.match(reason(validateWidget(grid([{ area: 'Salone!' }]), gridOf)), /areas: not an Area id/);
  assert.match(reason(validateWidget(grid([{ on_tap: 'rooms' }]), gridOf)), /areas: not an Area id/);
  assert.match(reason(validateWidget(grid(['salone', { area: 'salone', on_tap: null }]), gridOf)), /areas: salone twice/);
  const one: House = { hasEntity: () => false, hasArea: id => id === 'salone' };
  const v = validateWidget(
    grid([
      { area: 'gone', on_tap: 'rooms' },
      { area: 'salone', on_tap: 'rooms' },
    ]),
    gridOf,
    { house: one }
  );
  assert.equal(v.ok, true);
  if (v.ok) assert.deepEqual(v.settings.areas, [{ area: 'salone', light: null, temperature: null, on_tap: 'rooms' }]);
});
