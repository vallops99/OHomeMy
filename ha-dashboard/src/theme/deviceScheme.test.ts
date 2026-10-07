/**
 * What the device prefers, followed as it changes (#66, #70).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeviceScheme, DARK_QUERY, type DarkQuery } from './deviceScheme';

/** A `matchMedia` result whose answer the test flips. */
function fakeQuery(matches: boolean, media = DARK_QUERY) {
  const listeners = new Set<() => void>();
  const query: DarkQuery & { flip(to: boolean): void; listeners: Set<() => void> } = {
    get matches() {
      return matches;
    },
    media,
    addEventListener: (_type, l) => listeners.add(l),
    removeEventListener: (_type, l) => listeners.delete(l),
    flip(to) {
      matches = to;
      listeners.forEach(l => l());
    },
    listeners,
  };
  return query;
}

test('reads what the device prefers now', () => {
  assert.equal(createDeviceScheme(fakeQuery(true)).get(), 'dark');
  assert.equal(createDeviceScheme(fakeQuery(false)).get(), 'light');
});

test('a subscriber hears the device change, and stops hearing once it unsubscribes', () => {
  const query = fakeQuery(false);
  const scheme = createDeviceScheme(query);
  let heard = 0;
  const unsubscribe = scheme.subscribe(() => heard++);
  query.flip(true);
  assert.equal(heard, 1);
  assert.equal(scheme.get(), 'dark');
  unsubscribe();
  assert.equal(query.listeners.size, 0);
  query.flip(false);
  assert.equal(heard, 1);
});

test('with no media queries (no window) the device cannot say, and never changes', () => {
  const scheme = createDeviceScheme(null);
  assert.equal(scheme.get(), 'none');
  scheme.subscribe(() => assert.fail('nothing to hear'))();
});

test('a browser that does not know prefers-color-scheme cannot say either', () => {
  const query = fakeQuery(false, 'not all');
  const scheme = createDeviceScheme(query);
  assert.equal(scheme.get(), 'none');
  scheme.subscribe(() => assert.fail('nothing to hear'))();
  assert.equal(query.listeners.size, 0);
});
