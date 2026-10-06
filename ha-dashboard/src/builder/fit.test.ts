import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fits, overflows } from './fit';

const box = (clientWidth: number, clientHeight: number, scrollWidth = clientWidth, scrollHeight = clientHeight) => ({
  clientWidth,
  clientHeight,
  scrollWidth,
  scrollHeight,
});

test('a box that shows all it holds fits', () => {
  assert.equal(fits(box(300, 90)), true);
});

test('content more than a pixel taller or wider than its box does not fit', () => {
  assert.equal(overflows(box(300, 90, 300, 92)), true);
  assert.equal(overflows(box(300, 90, 302, 90)), true);
  assert.equal(fits(box(300, 90, 300, 140)), false);
});

test('a pixel of rounding is not overflow', () => {
  assert.equal(overflows(box(300, 90, 301, 91)), false);
});

test('a scrolling region inside the box that hides content does not fit either', () => {
  assert.equal(fits(box(300, 300), [box(300, 200, 300, 260)]), false);
  assert.equal(fits(box(300, 300), [box(300, 200)]), true);
});
