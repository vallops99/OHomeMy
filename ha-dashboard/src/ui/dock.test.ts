/**
 * The Dock's pure half (#41, docs/protocol.md "The Dock"): which of a Page's
 * `footer` goes into the Dock, in what order, which item is current, and when
 * the Dock is not shown at all.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Area, Entity, Placed } from '../ha';
import { besideDock, dockItems } from './dock';

const entity = (id: string, attributes: Record<string, unknown> = {}): Placed => ({
  kind: 'entity',
  entity: {
    id,
    domain: id.split('.')[0],
    name: id.split('.')[1],
    areaId: null,
    deviceId: null,
    labels: [],
    state: 'unknown',
    attributes,
    unavailable: false,
  } satisfies Entity,
});

const area = (id: string): Placed => ({ kind: 'area', area: { id, name: id, labels: [], icon: null, entities: [] } satisfies Area });

/** The Dock as `page:current` pairs, so a failure reads plainly. */
const pages = (items: ReturnType<typeof dockItems>) => items?.map(i => `${i.page}${i.current ? ' (current)' : ''}`) ?? null;

test('Casa comes first, then the footer’s Page Openers in the order they were Placed', () => {
  const footer = [area('corridoio'), entity('input_button.clima'), entity('media_player.ovunque'), entity('input_button.sicurezza')];

  assert.deepEqual(pages(dockItems(footer, 'main')), ['main (current)', 'clima', 'sicurezza']);
});

test('on a Page Opener’s own Page its item stays, and is the current one', () => {
  const footer = [entity('input_button.clima'), entity('input_button.sicurezza')];

  assert.deepEqual(pages(dockItems(footer, 'clima')), ['main', 'clima (current)', 'sicurezza']);
});

test('the current Page is compared by slug', () => {
  assert.deepEqual(pages(dockItems([entity('input_button.sala_tv')], 'sala-tv')), ['main', 'sala_tv (current)']);
});

test('on page:main a Dock that would hold only Casa is not shown', () => {
  assert.equal(dockItems([area('corridoio'), entity('media_player.ovunque')], 'main'), null);
  assert.equal(dockItems([], 'main'), null);
});

test('elsewhere the Dock is shown even with Casa alone, because Casa is the way home', () => {
  assert.deepEqual(pages(dockItems([], 'corridoio')), ['main']);
});

test('an item carries its helper’s name and icon, and Casa its own', () => {
  const [casa, clima, media] =
    dockItems([entity('input_button.clima', { icon: 'mdi:thermostat' }), entity('input_button.media')], 'main') ?? [];

  assert.deepEqual(casa, { key: 'casa', name: 'Casa', icon: 'mdi:home', page: 'main', current: true });
  assert.deepEqual(clima, { key: 'input_button.clima', name: 'clima', icon: 'mdi:thermostat', page: 'clima', current: false });
  // No icon of its own: the same fallback a Page Opener's block gets.
  assert.equal(media?.icon, 'mdi:arrow-right-bold-box-outline');
});

test('everything in the footer but its Page Openers sits beside the Dock, in order', () => {
  const footer = [area('corridoio'), entity('input_button.clima'), entity('media_player.ovunque'), entity('light.led')];

  assert.deepEqual(
    besideDock(footer).map(p => (p.kind === 'area' ? p.area.id : p.entity.id)),
    ['corridoio', 'media_player.ovunque', 'light.led']
  );
});
