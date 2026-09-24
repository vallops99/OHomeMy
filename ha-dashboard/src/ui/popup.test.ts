/**
 * The Popup's pure half (#28): reading the helper, splitting a Page into the
 * Feed behind it and the row floating over it, naming it, and pacing the
 * activity reports.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Area, Entity, PageLayout, Placed } from '../ha';
import { activityGate, popupPage, popupShape, popupTitle, slotKey } from './popup';

const entity = (id: string, state = 'on'): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: null,
  deviceId: null,
  labels: [],
  state,
  attributes: {},
  unavailable: state === 'unavailable' || state === 'unknown',
});

const area = (id: string, name = id, icon: string | null = null): Area => ({ id, name, labels: [], icon, entities: [] });

const e = (id: string): Placed => ({ kind: 'entity', entity: entity(id) });
const a = (id: string): Placed => ({ kind: 'area', area: area(id) });

const layout = (parts: Partial<PageLayout>): PageLayout => ({ glance: [], left: [], right: [], footer: [], ...parts });

/** A slot as ids, so the assertions read as the Page they describe. */
const ids = (slots: ReturnType<typeof popupShape>['row']) => slots.map(slotKey);

// ---- popupPage -------------------------------------------------------------

test('no helper at all is a closed Popup', () => {
  assert.equal(popupPage(null), null);
});

test('the helper names the Page, trimmed', () => {
  assert.equal(popupPage(entity('input_text.panel_popup', 'citofono')), 'citofono');
  assert.equal(popupPage(entity('input_text.panel_popup', '  citofono \n')), 'citofono');
});

test('an empty, unknown or unavailable helper is a closed Popup', () => {
  for (const state of ['', '   ', 'unknown', 'unavailable']) {
    assert.equal(popupPage(entity('input_text.panel_popup', state)), null, JSON.stringify(state));
  }
});

test('main and any other name are opened like every Page', () => {
  assert.equal(popupPage(entity('input_text.panel_popup', 'main')), 'main');
});

// ---- popupShape ------------------------------------------------------------

test('the first camera in right is the Feed, and leaves the row', () => {
  const shape = popupShape(
    layout({ right: [e('camera.campanello_live_view')], left: [e('lock.cancello'), e('lock.cancelletto')], footer: [e('lock.citofono')] })
  );
  assert.equal(shape.feed?.id, 'camera.campanello_live_view');
  assert.deepEqual(ids(shape.row), ['left:lock.cancello', 'left:lock.cancelletto', 'footer:lock.citofono']);
});

test('a Page with no camera in right has no Feed, and everything floats', () => {
  const shape = popupShape(layout({ right: [a('salone'), e('light.led')], footer: [a('corridoio')] }));
  assert.equal(shape.feed, null);
  assert.deepEqual(ids(shape.row), ['right:salone', 'right:light.led', 'footer:corridoio']);
});

test('a camera only in left is not the Feed', () => {
  const shape = popupShape(layout({ left: [e('camera.giardino')] }));
  assert.equal(shape.feed, null);
  assert.deepEqual(ids(shape.row), ['left:camera.giardino']);
});

test('the other cameras in right float together, where the first of them stood', () => {
  const shape = popupShape(layout({ right: [e('camera.uno'), e('light.led'), e('camera.due'), e('camera.tre'), e('lock.x')] }));
  assert.equal(shape.feed?.id, 'camera.uno');
  assert.deepEqual(ids(shape.row), ['right:light.led', 'right:camera.due+camera.tre', 'right:lock.x']);
});

test('the row runs left, then right, then footer', () => {
  const shape = popupShape(layout({ footer: [e('media_player.ovunque')], right: [e('light.led')], left: [e('lock.cancello')] }));
  assert.deepEqual(ids(shape.row), ['left:lock.cancello', 'right:light.led', 'footer:media_player.ovunque']);
});

test('a Popup has no glance quadrant', () => {
  const shape = popupShape(layout({ glance: [e('climate.termostato')], left: [e('lock.cancello')] }));
  assert.deepEqual(ids(shape.row), ['left:lock.cancello']);
});

test('the Popup is empty when it has nothing to show, glance or not', () => {
  assert.equal(popupShape(layout({})).empty, true);
  assert.equal(popupShape(layout({ glance: [e('climate.termostato')] })).empty, true);
  assert.equal(popupShape(layout({ right: [e('camera.uno')] })).empty, false);
  assert.equal(popupShape(layout({ footer: [a('corridoio')] })).empty, false);
});

// ---- popupTitle ------------------------------------------------------------

test('a Page named after an Area takes the Area name and icon', () => {
  assert.deepEqual(popupTitle('salone', [area('salone', 'Soggiorno', 'mdi:sofa')]), { name: 'Soggiorno', icon: 'mdi:sofa' });
});

test('any other Page is its own name, capitalised', () => {
  assert.equal(popupTitle('citofono', []).name, 'Citofono');
  assert.equal(popupTitle('porta_di_servizio', []).name, 'Porta di servizio');
});

test('a Page with no Area icon gets the bell', () => {
  assert.equal(popupTitle('citofono', []).icon, 'mdi:bell-ring-outline');
  assert.equal(popupTitle('salone', [area('salone', 'Soggiorno')]).icon, 'mdi:bell-ring-outline');
});

// ---- activityGate ----------------------------------------------------------

test('the first touch reports, and the next report waits 5 s', () => {
  const gate = activityGate(5_000);
  assert.equal(gate(100_000), true);
  assert.equal(gate(100_001), false);
  assert.equal(gate(104_999), false);
  assert.equal(gate(105_000), true);
  assert.equal(gate(106_000), false);
});

test('a touch at time zero still reports', () => {
  assert.equal(activityGate(5_000)(0), true);
});
