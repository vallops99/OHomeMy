/**
 * The placement resolver against docs/protocol.md, through `resolvePage` only.
 * Label ids are written as Home Assistant hands them back -- slugified, so
 * `page:main:footer` is `page_main_footer` -- because that is the spelling
 * the resolver actually receives.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupMemberIds, openerPage, placedPageFor, resolvePage, type PageLayout, type Region } from './placement';
import type { Area, Entity } from './types';

const entity = (id: string, labels: string[]): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: null,
  deviceId: null,
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
      placed.map(p =>
        p.kind === 'area'
          ? `area:${p.area.id}`
          : p.kind === 'group'
            ? `group:${p.entity.id}[${p.members.map(m => m.id).join(',')}]`
            : `entity:${p.entity.id}`
      ),
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

// ---- the camera glance's Page (#29) ----

const camera = (id: string, labels: string[]) => entity(`camera.${id}`, labels);

test('the glance opens the Page where every one of its cameras is also Placed in left or right', () => {
  const cams = [camera('a', ['page_main_glance', 'page_telecamere_right']), camera('b', ['page_main_glance', 'page_telecamere_left'])];

  assert.equal(placedPageFor(cams, ['page_main_glance', 'page_telecamere_right', 'page_telecamere_left'], 'main'), 'telecamere');
});

test('a Page holding only some of the cameras does not qualify', () => {
  const cams = [camera('a', ['page_main_glance', 'page_telecamere_right']), camera('b', ['page_main_glance'])];

  assert.equal(placedPageFor(cams, ['page_telecamere_right'], 'main'), null);
});

test('a Page holding the cameras only in glance or footer does not qualify', () => {
  const cams = [camera('a', ['page_main_glance', 'page_esterno_glance', 'page_casa_footer'])];

  assert.equal(placedPageFor(cams, ['page_main_glance', 'page_esterno_glance', 'page_casa_footer'], 'main'), null);
});

test('the current Page never qualifies, even when it holds the cameras as Feeds', () => {
  const cams = [camera('a', ['page_main_glance', 'page_main_right'])];

  assert.equal(placedPageFor(cams, ['page_main_glance', 'page_main_right'], 'main'), null);
});

test('the current Page is compared by slug, as a Page name is everywhere else', () => {
  const cams = [camera('a', ['page_sala_tv_right', 'page_esterno_right'])];

  assert.equal(placedPageFor(cams, ['page_sala_tv_right', 'page_esterno_right'], 'sala-tv'), 'esterno');
});

test('of several qualifying Pages, the first in label-registry order wins', () => {
  const cams = [camera('a', ['page_zeta_right', 'page_alfa_right']), camera('b', ['page_alfa_left', 'page_zeta_right'])];

  assert.equal(placedPageFor(cams, ['page_zeta_right', 'page_alfa_right', 'page_alfa_left'], 'main'), 'zeta');
  assert.equal(placedPageFor(cams, ['page_alfa_left', 'page_zeta_right', 'page_alfa_right'], 'main'), 'alfa');
});

test('a Page whose Labels the registry list does not hold yet sorts after those it does', () => {
  const cams = [camera('a', ['page_nuova_right', 'page_vecchia_right'])];

  assert.equal(placedPageFor(cams, ['page_vecchia_right'], 'main'), 'vecchia');
  assert.equal(placedPageFor(cams, [], 'main'), 'nuova');
});

test('no cameras opens nothing', () => {
  assert.equal(placedPageFor([], ['page_telecamere_right'], 'main'), null);
});

// ---- a member's Page: the same rule, for one entity (#32) ----

test('a footer entity leads to the other Page where it is Placed in left or right', () => {
  const media = entity('media_player.ovunque', ['page_main_footer', 'page_media_left']);

  assert.equal(placedPageFor([media], ['page_main_footer', 'page_media_left'], 'main'), 'media');
});

test('an entity Placed nowhere else in left or right leads nowhere', () => {
  const media = entity('media_player.ovunque', ['page_main_footer', 'page_corridoio_footer', 'page_clima_glance']);

  assert.equal(placedPageFor([media], [], 'main'), null);
});

test('on the Page it leads to, a member leads nowhere', () => {
  const media = entity('media_player.ovunque', ['page_media_footer', 'page_media_left']);

  assert.equal(placedPageFor([media], [], 'media'), null);
});

// ---- Page Openers (#32, ADR-0012) ----

test('an input_button is a Page Opener for the Page its object id names', () => {
  assert.equal(openerPage(entity('input_button.sicurezza', [])), 'sicurezza');
  assert.equal(openerPage(entity('input_button.sala_tv', [])), 'sala_tv');
});

test('nothing else is a Page Opener', () => {
  assert.equal(openerPage(entity('button.sicurezza', [])), null);
  assert.equal(openerPage(entity('script.sicurezza', [])), null);
});

test('a Page Opener is skipped on its own Page in left and right, and only there', () => {
  const opener = entity('input_button.clima', ['page_main_footer', 'page_clima_left', 'page_clima_right']);
  const other = entity('input_button.media', ['page_clima_right']);

  assert.deepEqual(ids(resolvePage([], entities(opener, other), 'clima')), { ...empty, right: ['entity:input_button.media'] });
  assert.deepEqual(ids(resolvePage([], entities(opener, other), 'main')), { ...empty, footer: ['entity:input_button.clima'] });
});

test('a Page Opener stays in its own Page’s footer, where the Dock marks it current', () => {
  const opener = entity('input_button.clima', ['page_clima_footer', 'page_clima_glance']);

  assert.deepEqual(ids(resolvePage([], entities(opener), 'clima')), {
    ...empty,
    glance: ['entity:input_button.clima'],
    footer: ['entity:input_button.clima'],
  });
});

test('a Page Opener’s own Page is compared by slug', () => {
  const opener = entity('input_button.sala_tv', ['page_sala_tv_right']);

  assert.deepEqual(ids(resolvePage([], entities(opener), 'sala-tv')), empty);
});

// ---- Groups (ADR-0014) ----

/** A Group helper: a Placed entity whose `entity_id` attribute names its members. */
const group = (id: string, members: string[], labels: string[]): Entity => ({ ...entity(id, labels), attributes: { entity_id: members } });

test('an entity with an `entity_id` attribute is a Group, its members in the attribute’s order', () => {
  assert.deepEqual(groupMemberIds(group('lock.accessi', ['lock.b', 'lock.a'], [])), ['lock.b', 'lock.a']);
});

test('an Unavailable Group, which has lost `entity_id`, is still one through `group_entities`', () => {
  const helper = {
    ...entity('lock.accessi', []),
    state: 'unavailable',
    unavailable: true,
    attributes: { group_entities: ['lock.a', 'lock.b'] },
  };
  assert.deepEqual(groupMemberIds(helper), ['lock.a', 'lock.b']);
});

test('an entity without one is not a Group', () => {
  assert.equal(groupMemberIds(entity('lock.cancello', [])), null);
  assert.equal(groupMemberIds({ ...entity('lock.cancello', []), attributes: { entity_id: 'lock.a' } }), null);
});

test('a Placed Group carries its members, in the attribute’s order, which need no Labels', () => {
  const cancello = entity('lock.cancello', []);
  const cancelletto = entity('lock.cancelletto', []);
  const accessi = group('lock.accessi', ['lock.cancelletto', 'lock.cancello'], ['page_main_left']);

  assert.deepEqual(ids(resolvePage([], entities(cancello, cancelletto, accessi), 'main')), {
    ...empty,
    left: ['group:lock.accessi[lock.cancelletto,lock.cancello]'],
  });
});

test('a member the dashboard does not have is left out of its Group', () => {
  const cancello = entity('lock.cancello', []);
  const accessi = group('lock.accessi', ['lock.cancello', 'lock.ignorato'], ['page_main_left']);

  assert.deepEqual(ids(resolvePage([], entities(cancello, accessi), 'main')).left, ['group:lock.accessi[lock.cancello]']);
});

test('a member Placed on its own in its Group’s Region shows only inside the card', () => {
  const cancello = entity('lock.cancello', ['page_main_left']);
  const accessi = group('lock.accessi', ['lock.cancello'], ['page_main_left']);

  assert.deepEqual(ids(resolvePage([], entities(cancello, accessi), 'main')).left, ['group:lock.accessi[lock.cancello]']);
});

test('a member Placed anywhere else renders there as usual', () => {
  const cancello = entity('lock.cancello', ['page_main_right', 'page_citofono_left']);
  const accessi = group('lock.accessi', ['lock.cancello'], ['page_main_left']);

  assert.deepEqual(ids(resolvePage([], entities(cancello, accessi), 'main')), {
    ...empty,
    left: ['group:lock.accessi[lock.cancello]'],
    right: ['entity:lock.cancello'],
  });
  assert.deepEqual(ids(resolvePage([], entities(cancello, accessi), 'citofono')).left, ['entity:lock.cancello']);
});

test('in footer and glance a Group has no card, so its members Placed there still render', () => {
  const lamp = entity('light.lamp', ['page_main_footer']);
  const luci = group('light.luci', ['light.lamp'], ['page_main_footer']);

  assert.deepEqual(ids(resolvePage([], entities(lamp, luci), 'main')).footer, ['group:light.luci[light.lamp]', 'entity:light.lamp']);
});

test('within a Region: Areas, then Groups, then the remaining entities, each in registry order', () => {
  const lamp = entity('light.lamp', ['page_main_left']);
  const zeta = group('lock.zeta', [], ['page_main_left']);
  const sensor = entity('sensor.t', ['page_main_left']);
  const alfa = group('light.alfa', [], ['page_main_left']);
  const ingresso = area('ingresso', ['page_main_left']);

  assert.deepEqual(ids(resolvePage([ingresso], entities(lamp, zeta, sensor, alfa), 'main')).left, [
    'area:ingresso',
    'group:lock.zeta[]',
    'group:light.alfa[]',
    'entity:light.lamp',
    'entity:sensor.t',
  ]);
});
