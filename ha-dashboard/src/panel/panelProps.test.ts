/**
 * The panel element's properties, carried to a React tree that outlives the
 * element (#46).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPanelStore } from './panelProps';

const panel = { url_path: 'ohomemy-wall', config: { dashboard_id: 'wall' } };

test('starts empty and wide', () => {
  assert.deepEqual(createPanelStore().get(), { panel: null, route: null, narrow: false });
});

test('a set merges into what is there and tells every listener', () => {
  const store = createPanelStore();
  let heard = 0;
  store.subscribe(() => heard++);
  store.subscribe(() => heard++);
  store.set({ panel });
  store.set({ narrow: true });
  assert.deepEqual(store.get(), { panel, route: null, narrow: true });
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
