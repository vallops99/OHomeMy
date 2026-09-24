/**
 * The Row swipe's decision (#27): how far the Row follows the finger, and
 * whether letting go opens the Area's Page or springs back. The values and
 * their sources are in docs/research/row-swipe-gesture.md.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { swipeCommits, swipeOffset, type SwipeRelease } from './rowSwipe';

/** A slow, deliberate release on a 600 px Row, nothing aborted. */
const release = (parts: Partial<SwipeRelease>): SwipeRelease => ({
  offset: 0,
  width: 600,
  velocity: 0,
  direction: 0,
  aborted: false,
  ...parts,
});

// ---- swipeOffset -----------------------------------------------------------

test('the Row follows a rightward finger', () => {
  assert.equal(swipeOffset(120), 120);
});

test('the Row never moves left of where it rests', () => {
  assert.equal(swipeOffset(-80), 0);
});

// ---- swipeCommits: distance ------------------------------------------------

test('letting go past a third of the Row opens the Page', () => {
  assert.equal(swipeCommits(release({ offset: 200 })), true);
  assert.equal(swipeCommits(release({ offset: 260 })), true);
});

test('letting go short of a third springs back', () => {
  assert.equal(swipeCommits(release({ offset: 199 })), false);
});

test('the third is of this Row, not of a fixed width', () => {
  assert.equal(swipeCommits(release({ offset: 150, width: 420 })), true);
  assert.equal(swipeCommits(release({ offset: 150, width: 600 })), false);
});

// ---- swipeCommits: flick ---------------------------------------------------

test('a rightward flick past 50 px opens the Page, however short of a third', () => {
  assert.equal(swipeCommits(release({ offset: 50, velocity: 0.5, direction: 1 })), true);
  assert.equal(swipeCommits(release({ offset: 80, velocity: 1.4, direction: 1 })), true);
});

test('a flick under 50 px springs back', () => {
  assert.equal(swipeCommits(release({ offset: 49, velocity: 2, direction: 1 })), false);
});

test('a movement slower than a flick springs back', () => {
  assert.equal(swipeCommits(release({ offset: 120, velocity: 0.49, direction: 1 })), false);
});

test('a fast movement back towards rest is not a flick', () => {
  // Dragged out, then flicked back left: velocity is absolute, the sign is
  // in `direction`, and a flick home is a change of mind.
  assert.equal(swipeCommits(release({ offset: 120, velocity: 1.2, direction: -1 })), false);
});

// ---- swipeCommits: aborted -------------------------------------------------

test('an aborted gesture never opens the Page, however far it went', () => {
  // A vertical scroll under `pan-y` arrives as an ordinary last event.
  assert.equal(swipeCommits(release({ offset: 400, aborted: true })), false);
  assert.equal(swipeCommits(release({ offset: 120, velocity: 1.2, direction: 1, aborted: true })), false);
});

test('a Row with no width yet opens only on a flick', () => {
  // Not measured (unmounted mid-gesture): a third of nothing must not be
  // "any distance at all".
  assert.equal(swipeCommits(release({ offset: 30, width: 0 })), false);
  assert.equal(swipeCommits(release({ offset: 60, width: 0, velocity: 0.8, direction: 1 })), true);
});
