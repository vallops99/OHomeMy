/**
 * What a Dashboard shows (#53): every entity its Widgets put on screen, on
 * any of its Pages, read off each kind's schema rather than per kind.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defineSchema, type WidgetSchema } from './schema';
import { dashboardShows, isNamed, isShown } from './shows';
import type { Dashboard, Page, Widget } from './types';

// Kinds this test makes up: the derivation must work for any kind, by its
// field types alone.
const SCHEMAS: Record<string, WidgetSchema> = {
  one: defineSchema({ kind: 'one', variants: ['full'], titled: true, settings: { entity: { type: 'entity', domains: [] } } }),
  maybe: defineSchema({
    kind: 'maybe',
    variants: ['full'],
    titled: false,
    settings: { sensor: { type: 'entity', domains: ['sensor'], optional: true }, label: { type: 'text', optional: true } },
  }),
  many: defineSchema({
    kind: 'many',
    variants: ['full'],
    titled: false,
    settings: { cameras: { type: 'entities', domains: ['camera'], min: 0 } },
  }),
  room: defineSchema({
    kind: 'room',
    variants: ['full'],
    titled: true,
    settings: { area: { type: 'area', shows: ['light'] }, light: { type: 'entity', domains: ['light'], optional: true } },
  }),
  rooms: defineSchema({
    kind: 'rooms',
    variants: ['full'],
    titled: true,
    settings: { areas: { type: 'areas', shows: ['light', 'climate'] } },
  }),
  group: defineSchema({
    kind: 'group',
    variants: ['full'],
    titled: true,
    settings: { members: { type: 'members', domains: ['lock'], variantDomains: [] } },
  }),
  bare_area: defineSchema({ kind: 'bare_area', variants: ['full'], titled: false, settings: { area: { type: 'area' } } }),
  nothing: defineSchema({ kind: 'nothing', variants: ['full'], titled: false, settings: {} }),
};
const schemaOf = (kind: string) => SCHEMAS[kind];

let n = 0;
const widget = (kind: string, settings: Record<string, unknown>, overrides: Partial<Widget> = {}): Widget => ({
  id: `w${n++}`,
  kind,
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  variant: 'full',
  title: null,
  on_tap: null,
  settings,
  ...overrides,
});

const page = (id: string, widgets: Widget[], popup: string | null = null): Page => ({
  id,
  name: id,
  popup,
  grid: { columns: 4, rows: 4 },
  widgets,
});

const dashboard = (pages: Page[]): Dashboard => ({
  id: 'd',
  slug: 'd',
  name: 'D',
  show_in_sidebar: true,
  home_page: pages[0].id,
  settings: {
    overflow: 'fit',
    supported_range: { min: { width: 1, height: 1 }, max: { width: 2, height: 2 } },
    idle_return: null,
    back_history: true,
    theme: { name: 'casa-panel', mode: 'follow-device' },
  },
  navbar: null,
  pages,
});

const e = (id: string, areaId: string | null = null) => ({ id, domain: id.split('.')[0], areaId });

test('every entity a setting names, on every Page, counts as shown', () => {
  const shows = dashboardShows(
    dashboard([
      page('home', [widget('one', { entity: 'lock.gate' })]),
      page('cameras', [widget('many', { cameras: ['camera.door', 'camera.yard'] })]),
    ]),
    schemaOf
  );
  for (const id of ['lock.gate', 'camera.door', 'camera.yard']) assert.ok(isShown(shows, e(id)), id);
  assert.ok(!isShown(shows, e('camera.garage')));
});

test("each Member's entity counts as shown, a plain id or a Member with settings", () => {
  const members = [{ entity: 'lock.gate', name: 'Cancello', variant: null, on_tap: null }, 'lock.door'];
  const shows = dashboardShows(dashboard([page('home', [widget('group', { members })])]), schemaOf);
  assert.deepEqual([...shows.entities], ['lock.gate', 'lock.door']);
});

test('a Popup Page is one of the Dashboard’s Pages too', () => {
  const shows = dashboardShows(
    dashboard([page('home', []), page('ring', [widget('one', { entity: 'camera.door' })], 'doorbell')]),
    schemaOf
  );
  assert.ok(isShown(shows, e('camera.door')));
});

test('an unset optional entity and settings that are not entities name nothing', () => {
  const shows = dashboardShows(
    dashboard([page('home', [widget('maybe', { label: 'sensor.not_an_entity' }), widget('nothing', {})])]),
    schemaOf
  );
  assert.equal(shows.entities.size, 0);
  assert.equal(shows.areas.size, 0);
});

test('an Area counts the Domains its kind says it shows there, and only those', () => {
  const shows = dashboardShows(dashboard([page('home', [widget('room', { area: 'salone', light: 'light.lamp' })])]), schemaOf);
  assert.ok(isShown(shows, e('light.ceiling', 'salone')), 'a light the Room Tile counts');
  assert.ok(isShown(shows, e('light.lamp', 'salone')), 'its chosen light');
  assert.ok(!isShown(shows, e('sensor.echo_temperature', 'salone')), 'a sensor it does not show');
  assert.ok(!isShown(shows, e('light.ceiling', 'cucina')), 'a light in another Area');
  assert.ok(!isShown(shows, e('light.ceiling', null)));
});

test('the Domains several Widgets show from one Area add up', () => {
  const shows = dashboardShows(
    dashboard([
      page('home', [widget('room', { area: 'salone' })]),
      page('rooms', [widget('rooms', { areas: ['salone', { area: 'cucina', on_tap: 'home' }] })]),
    ]),
    schemaOf
  );
  assert.deepEqual([...(shows.areas.get('salone') ?? [])].sort(), ['climate', 'light']);
  assert.ok(isShown(shows, e('climate.thermostat', 'cucina')));
});

test('an Area whose kind shows nothing from it adds no entity', () => {
  const shows = dashboardShows(dashboard([page('home', [widget('bare_area', { area: 'salone' })])]), schemaOf);
  assert.ok(!isShown(shows, e('light.ceiling', 'salone')));
});

test('named is what a setting names, not what an Area shows', () => {
  const shows = dashboardShows(dashboard([page('home', [widget('room', { area: 'salone', light: 'light.lamp' })])]), schemaOf);
  assert.ok(isNamed(shows, 'light.lamp'));
  assert.ok(!isNamed(shows, 'light.ceiling'));
});

test('a Widget the renderer skips shows nothing', () => {
  const shows = dashboardShows(
    dashboard([
      page('home', [
        widget('unknown_kind', { entity: 'lock.a' }),
        widget('one', { entity: 'lock.b' }, { variant: 'compact' }),
        widget('one', { entity: 'lock.c' }, { x: 4 }),
        widget('one', { entity: 'lock.d', extra: true }),
      ]),
    ]),
    schemaOf
  );
  assert.equal(shows.entities.size, 0);
});

test('with the house given, what Home Assistant no longer has is dropped as the renderer drops it', () => {
  const house = { hasEntity: (id: string) => id !== 'camera.gone', hasArea: () => true };
  const shows = dashboardShows(dashboard([page('home', [widget('many', { cameras: ['camera.gone', 'camera.door'] })])]), schemaOf, house);
  assert.deepEqual([...shows.entities], ['camera.door']);
});

test('another Dashboard’s Widgets are not this one’s', () => {
  const mine = dashboard([page('home', [widget('one', { entity: 'camera.door' })])]);
  const theirs = dashboard([page('home', [widget('one', { entity: 'camera.yard' })])]);
  assert.ok(!isShown(dashboardShows(mine, schemaOf), e('camera.yard')));
  assert.ok(isShown(dashboardShows(theirs, schemaOf), e('camera.yard')));
});
