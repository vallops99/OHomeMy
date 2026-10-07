/**
 * A switch of light and dark waits while anyone touches the Dashboard (#70).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { holding, touchHold, type Hold, type HoldEvent } from './touchHold';

const run = (start: Hold, ...events: HoldEvent[]) => events.reduce(touchHold, start);
const dark = holding('dark');

test('with no pointer down, a switch applies at once', () => {
  const s = run(dark, { type: 'want', scheme: 'light' });
  assert.equal(s.shown, 'light');
  assert.equal(s.pending, null);
});

test('a switch that arrives while a pointer is down waits for it to lift', () => {
  let s = run(dark, { type: 'down', id: 1 }, { type: 'want', scheme: 'light' });
  assert.equal(s.shown, 'dark');
  assert.equal(s.pending, 'light');
  s = run(s, { type: 'up', id: 1 });
  assert.equal(s.shown, 'light');
  assert.equal(s.pending, null);
});

test('it waits for the last of several pointers, in any order', () => {
  let s = run(dark, { type: 'down', id: 1 }, { type: 'down', id: 2 }, { type: 'want', scheme: 'light' }, { type: 'up', id: 1 });
  assert.equal(s.shown, 'dark');
  s = run(s, { type: 'down', id: 3 }, { type: 'up', id: 2 });
  assert.equal(s.shown, 'dark');
  s = run(s, { type: 'up', id: 3 });
  assert.equal(s.shown, 'light');
});

test('a lift of a pointer it never saw go down changes nothing', () => {
  const s = run(dark, { type: 'down', id: 1 }, { type: 'want', scheme: 'light' }, { type: 'up', id: 9 });
  assert.equal(s.shown, 'dark');
  assert.deepEqual([...s.down], [1]);
});

test('the same pointer down twice still needs only one lift', () => {
  const s = run(dark, { type: 'down', id: 1 }, { type: 'down', id: 1 }, { type: 'want', scheme: 'light' }, { type: 'up', id: 1 });
  assert.equal(s.shown, 'light');
});

test('when every pointer is forgotten at once (the window lost focus), the switch applies', () => {
  const s = run(dark, { type: 'down', id: 1 }, { type: 'down', id: 2 }, { type: 'want', scheme: 'light' }, { type: 'release-all' });
  assert.equal(s.shown, 'light');
  assert.equal(s.down.size, 0);
});

test('the latest wish wins while held, and a wish back to what is shown cancels the switch', () => {
  let s = run(dark, { type: 'down', id: 1 }, { type: 'want', scheme: 'light' }, { type: 'want', scheme: 'dark' });
  assert.equal(s.pending, null);
  s = run(s, { type: 'up', id: 1 });
  assert.equal(s.shown, 'dark');
});

test('a switch waits while any finger is on the screen, and applies when the last lifts', () => {
  let s = run(dark, { type: 'touches', count: 1 }, { type: 'touches', count: 2 }, { type: 'want', scheme: 'light' });
  assert.equal(s.shown, 'dark');
  s = run(s, { type: 'touches', count: 1 });
  assert.equal(s.shown, 'dark');
  s = run(s, { type: 'touches', count: 0 });
  assert.equal(s.shown, 'light');
});

test('a finger and a mouse both down: the switch waits for both', () => {
  let s = run(
    dark,
    { type: 'touches', count: 1 },
    { type: 'down', id: 1 },
    { type: 'want', scheme: 'light' },
    { type: 'touches', count: 0 }
  );
  assert.equal(s.shown, 'dark');
  s = run(s, { type: 'up', id: 1 });
  assert.equal(s.shown, 'light');
  s = run(s, { type: 'down', id: 2 }, { type: 'touches', count: 1 }, { type: 'want', scheme: 'dark' }, { type: 'up', id: 2 });
  assert.equal(s.shown, 'light');
  s = run(s, { type: 'touches', count: 0 });
  assert.equal(s.shown, 'dark');
});

test('forgetting everything at once also forgets the fingers', () => {
  const s = run(dark, { type: 'touches', count: 2 }, { type: 'want', scheme: 'light' }, { type: 'release-all' });
  assert.equal(s.shown, 'light');
  assert.equal(s.touches, 0);
});

test('nothing to switch is the same state, so nothing redraws', () => {
  assert.equal(touchHold(dark, { type: 'want', scheme: 'dark' }), dark);
  assert.equal(touchHold(dark, { type: 'up', id: 1 }), dark);
  assert.equal(touchHold(dark, { type: 'release-all' }), dark);
  assert.equal(touchHold(dark, { type: 'touches', count: 0 }), dark);
});
