/**
 * Whether the device is dark, followed as it changes (#66).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeviceScheme, isDark, type DarkQuery } from './deviceScheme';

/** A `matchMedia` result whose answer the test flips. */
function fakeQuery(matches: boolean) {
  const listeners = new Set<() => void>();
  const query: DarkQuery & { flip(to: boolean): void; listeners: Set<() => void> } = {
    get matches() {
      return matches;
    },
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

test('reads whether the device is dark now', () => {
  assert.equal(createDeviceScheme(fakeQuery(true)).get(), true);
  assert.equal(createDeviceScheme(fakeQuery(false)).get(), false);
});

test('a subscriber hears the device change, and stops hearing once it unsubscribes', () => {
  const query = fakeQuery(false);
  const scheme = createDeviceScheme(query);
  let heard = 0;
  const unsubscribe = scheme.subscribe(() => heard++);
  query.flip(true);
  assert.equal(heard, 1);
  assert.equal(scheme.get(), true);
  unsubscribe();
  assert.equal(query.listeners.size, 0);
  query.flip(false);
  assert.equal(heard, 1);
});

test('with no media queries (no window) the device is light and never changes', () => {
  const scheme = createDeviceScheme(null);
  assert.equal(scheme.get(), false);
  scheme.subscribe(() => assert.fail('nothing to hear'))();
});

test('a fixed mode ignores the device; auto follows it', () => {
  assert.equal(isDark('dark', false), true);
  assert.equal(isDark('light', true), false);
  assert.equal(isDark('auto', true), true);
  assert.equal(isDark('auto', false), false);
});
