/**
 * The placement resolver against docs/protocol.md, through `resolvePage` only.
 * Label ids are written as Home Assistant hands them back -- slugified, so
 * `page:main:footer` is `page_main_footer` -- because that is the spelling
 * the resolver actually receives.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolvePage, type PageLayout, type Region } from './placement';
import type { Area, Entity } from './types';

const entity = (id: string, labels: string[]): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: null,
  labels,
  state: 'on',
  attributes: {},
  unavailable: false,
});

const area = (id: string, labels: string[]): Area => ({ id, name: id, labels, icon: null, entities: [] });

const entities = (...list: Entity[]) => new Map(list.map(e => [e.id, e]));

/** A layout as ids per Region, `area:` / `entity:` prefixed, so a failure reads plainly. */
const ids = (layout: PageLayout): Record<Region, string[]> =>
  Object.fromEntries(
    Object.entries(layout).map(([region, placed]) => [
      region,
      placed.map(p => (p.kind === 'area' ? `area:${p.area.id}` : `entity:${p.entity.id}`)),
    ])
  ) as Record<Region, string[]>;

const empty = { glance: [], left: [], right: [], footer: [] };

test('an entity carrying two Placement Labels renders in both Pages’ footers', () => {
  const media = entity('media_player.ovunque', ['page_main_footer', 'page_corridoio_footer']);

  assert.deepEqual(ids(resolvePage([], entities(media), 'main')), { ...empty, footer: ['entity:media_player.ovunque'] });
  assert.deepEqual(ids(resolvePage([], entities(media), 'corridoio')), {
    ...empty,
    footer: ['entity:media_player.ovunque'],
  });
});

test('an Area carrying two Placement Labels lands in a different Region on each Page', () => {
  const salone = area('salone', ['page_main_right', 'page_cucina_footer']);

  assert.deepEqual(ids(resolvePage([salone], entities(), 'main')), { ...empty, right: ['area:salone'] });
  assert.deepEqual(ids(resolvePage([salone], entities(), 'cucina')), { ...empty, footer: ['area:salone'] });
});

test('two identical Placement Labels render once', () => {
  const salone = area('salone', ['page_main_right', 'page_main_right']);
  const led = entity('light.led_cucina', ['page_main_right', 'page_main_right']);

  assert.deepEqual(ids(resolvePage([salone], entities(led), 'main')), {
    ...empty,
    right: ['area:salone', 'entity:light.led_cucina'],
  });
});

test('two Placement Labels naming one Page and two Regions render in both', () => {
  const thermostat = entity('climate.salone_termo', ['page_main_glance', 'page_main_right']);

  assert.deepEqual(ids(resolvePage([], entities(thermostat), 'main')), {
    ...empty,
    glance: ['entity:climate.salone_termo'],
    right: ['entity:climate.salone_termo'],
  });
});

test('an Area placed in its own Page’s footer is skipped there, and only there', () => {
  const corridoio = area('corridoio', ['page_corridoio_footer', 'page_corridoio_right', 'page_main_footer']);

  assert.deepEqual(ids(resolvePage([corridoio], entities(), 'corridoio')), { ...empty, right: ['area:corridoio'] });
  assert.deepEqual(ids(resolvePage([corridoio], entities(), 'main')), { ...empty, footer: ['area:corridoio'] });
});

test('malformed Placement Labels place nothing, silently, beside one that works', () => {
  const lamp = entity('light.lamp', [
    'page_main_rigth', // unknown Region
    'page_main_top_left', // reads as Page `main_top`, Region `left` -- another Page
    'page_main', // no Region half
    'page_footer', // a Page named nothing
    'page_main_footer_extra', // extra coordinates
    'region_right', // the retired paired grammar
    'page_main_glance',
  ]);

  assert.deepEqual(ids(resolvePage([], entities(lamp), 'main')), { ...empty, glance: ['entity:light.lamp'] });
});

test('a Page whose every Placement Label is malformed resolves empty', () => {
  const lamp = entity('light.lamp', ['page_main', 'region_right', 'page_main_rigth']);

  assert.deepEqual(ids(resolvePage([], entities(lamp), 'main')), empty);
});

test('a Page name keeps its own hyphens and underscores', () => {
  const lamp = entity('light.lamp', ['page_camera_chri_left']);

  assert.deepEqual(ids(resolvePage([], entities(lamp), 'camera-chri')), { ...empty, left: ['entity:light.lamp'] });
  assert.deepEqual(ids(resolvePage([], entities(lamp), 'camera_chri')), { ...empty, left: ['entity:light.lamp'] });
});

test('within a Region, Areas come first, then entities, each in registry order', () => {
  const media = entity('media_player.ovunque', ['page_main_footer']);
  const cucina = area('cucina', ['page_main_footer']);
  const corridoio = area('corridoio', ['page_main_footer', 'page_main_footer']);
  const vacuum = entity('vacuum.robot', ['page_main_footer']);

  assert.deepEqual(ids(resolvePage([cucina, corridoio], entities(media, vacuum), 'main')), {
    ...empty,
    footer: ['area:cucina', 'area:corridoio', 'entity:media_player.ovunque', 'entity:vacuum.robot'],
  });
});

test('`ignored` mutes an Area on every one of its placements', () => {
  const salone = area('salone', ['page_main_right', 'page_cucina_footer', 'ignored']);

  assert.deepEqual(ids(resolvePage([salone], entities(), 'main')), empty);
  assert.deepEqual(ids(resolvePage([salone], entities(), 'cucina')), empty);
});
