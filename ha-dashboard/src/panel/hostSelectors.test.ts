/**
 * Document-level selectors re-aimed at the panel's shadow host (#46).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toHostSelector } from './hostSelectors';

test(':root, html and body become :host', () => {
  assert.equal(toHostSelector(':root'), ':host');
  assert.equal(toHostSelector('html'), ':host');
  assert.equal(toHostSelector('body'), ':host');
});

test('a descendant of the document root becomes a descendant of the host', () => {
  assert.equal(toHostSelector(':root .modal'), ':host .modal');
  assert.equal(toHostSelector('body > div'), ':host > div');
  assert.equal(toHostSelector('body>div'), ':host>div');
});

test('everything else is left alone', () => {
  assert.equal(toHostSelector('.css-1abc'), '.css-1abc');
  assert.equal(toHostSelector('.modal-container .slider-track-bar'), '.modal-container .slider-track-bar');
  // Selectors that only start with the same letters.
  assert.equal(toHostSelector('htmlish'), 'htmlish');
  assert.equal(toHostSelector('body-text'), 'body-text');
  // No faithful :host spelling, so not rewritten.
  assert.equal(toHostSelector('html.dark'), 'html.dark');
  assert.equal(toHostSelector(':root[dir=rtl]'), ':root[dir=rtl]');
  // Only the first compound is the document's.
  assert.equal(toHostSelector('.x body'), '.x body');
});
