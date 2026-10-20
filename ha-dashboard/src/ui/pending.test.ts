/**
 * A released slider keeps its value until Home Assistant catches up (#71),
 * through the pure rule `Dimmer` and `Slider` share.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pendingShown, PENDING_MS, type Pending } from './pending';

// Released at 70 over a live 40, at t = 1000.
const released: Pending = { value: 70, from: 40, at: 1000 };

test('nothing pending shows the live value', () => {
  assert.equal(pendingShown(null, 40, 1000), 40);
});

test('released, the bar keeps the released value while the live value has not moved', () => {
  assert.equal(pendingShown(released, 40, 1000), 70);
  assert.equal(pendingShown(released, 40, 1000 + PENDING_MS - 1), 70);
});

test('released, then the live value changes to the one sent: the live value is shown', () => {
  // Pending until Home Assistant reports, then the report itself.
  assert.equal(pendingShown(released, 40, 1200), 70);
  assert.equal(pendingShown(released, 70, 1300), 70);
  assert.equal(pendingShown(released, 75, 1400), 75, 'and later changes follow the live value too');
});

test('a live value other than the one sent still wins: rounding and clamping', () => {
  assert.equal(pendingShown(released, 69, 1300), 69);
  assert.equal(pendingShown({ value: 0, from: 40, at: 1000 }, 1, 1300), 1);
});

test('the live value wins once the timeout elapses with no change', () => {
  assert.equal(pendingShown(released, 40, 1000 + PENDING_MS), 40);
});

test('a value released equal to the live one simply shows it', () => {
  assert.equal(pendingShown({ value: 40, from: 40, at: 1000 }, 40, 1100), 40);
});
