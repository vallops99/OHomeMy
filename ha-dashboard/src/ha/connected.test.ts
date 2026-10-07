/**
 * Whether the websocket is up, followed as it drops and comes back (#70).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createConnected, type ConnectionEvents } from './connected';

function fakeConnection(connected: boolean) {
  const listeners = { ready: new Set<() => void>(), disconnected: new Set<() => void>() };
  const conn: ConnectionEvents & { set(to: boolean): void; listeners: typeof listeners } = {
    get connected() {
      return connected;
    },
    addEventListener: (type, l) => listeners[type].add(l),
    removeEventListener: (type, l) => listeners[type].delete(l),
    set(to) {
      connected = to;
      listeners[to ? 'ready' : 'disconnected'].forEach(l => l());
    },
    listeners,
  };
  return conn;
}

test('no connection yet is not connected', () => {
  const source = createConnected(null);
  assert.equal(source.get(), false);
  source.subscribe(() => assert.fail('nothing to hear'))();
});

test('hears the connection drop and come back, and stops hearing once unsubscribed', () => {
  const conn = fakeConnection(true);
  const source = createConnected(conn);
  const heard: boolean[] = [];
  const unsubscribe = source.subscribe(() => heard.push(source.get()));
  assert.equal(source.get(), true);
  conn.set(false);
  conn.set(true);
  assert.deepEqual(heard, [false, true]);
  unsubscribe();
  assert.equal(conn.listeners.ready.size + conn.listeners.disconnected.size, 0);
});
