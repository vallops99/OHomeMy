/**
 * The panel element's properties, carried to a React tree that outlives the
 * element (#46).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPanelStore, hassPatch } from './panelProps';

const panel = { url_path: 'ohomemy-wall', config: { dashboard_id: 'wall' } };

test('starts empty and wide', () => {
  assert.deepEqual(createPanelStore().get(), { panel: null, route: null, narrow: false, locale: null, timeZone: null });
});

test('a set merges into what is there and tells every listener', () => {
  const store = createPanelStore();
  let heard = 0;
  store.subscribe(() => heard++);
  store.subscribe(() => heard++);
  store.set({ panel });
  store.set({ narrow: true });
  assert.deepEqual(store.get(), { panel, route: null, narrow: true, locale: null, timeZone: null });
  assert.equal(heard, 4);
});

test('setting the same values again is not a change', () => {
  // A new element is handed the same `panel` object it had before the remount.
  const store = createPanelStore();
  store.set({ panel, narrow: true });
  const before = store.get();
  let heard = 0;
  store.subscribe(() => heard++);
  store.set({ panel, narrow: true });
  assert.equal(heard, 0);
  assert.equal(store.get(), before);
});

test('an unsubscribed listener hears nothing more', () => {
  const store = createPanelStore();
  let heard = 0;
  const off = store.subscribe(() => heard++);
  store.set({ narrow: true });
  off();
  store.set({ narrow: false });
  assert.equal(heard, 1);
});

test("of `hass`, only the viewer's locale and the server's time zone are kept (#59)", () => {
  const locale = { language: 'ar', time_format: '24' };
  const hass = { locale, config: { time_zone: 'Europe/Rome' }, states: { 'light.a': {} } };
  assert.deepEqual(hassPatch(hass), { locale, timeZone: 'Europe/Rome' });
  assert.deepEqual(hassPatch(undefined), { locale: null, timeZone: null });

  // A state change hands the same `locale` object: nothing for the tree to hear.
  const store = createPanelStore();
  store.set(hassPatch(hass));
  let heard = 0;
  store.subscribe(() => heard++);
  store.set(hassPatch({ ...hass, states: {} }));
  assert.equal(heard, 0);
});
