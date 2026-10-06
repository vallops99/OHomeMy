import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SLUG_MAX, slugify, slugProblem, uniqueSlug } from './slug';

test('a slug is lowercase letters and digits joined by single hyphens', () => {
  assert.equal(slugProblem('wall', []), null);
  assert.equal(slugProblem('wall-tablet-2', []), null);
  for (const bad of ['Wall', 'wall tablet', '-wall', 'wall-', 'wall--tablet', 'wall_tablet', 'cucìna']) {
    assert.equal(slugProblem(bad, []), 'format', bad);
  }
});

test('a slug is not empty, fits in 40 characters and is not taken', () => {
  assert.equal(slugProblem('', []), 'empty');
  assert.equal(slugProblem('a'.repeat(SLUG_MAX), []), null);
  assert.equal(slugProblem('a'.repeat(SLUG_MAX + 1), []), 'too_long');
  assert.equal(slugProblem('wall', ['phone', 'wall']), 'taken');
});

test('a name suggests its slug, accents and punctuation dropped', () => {
  assert.equal(slugify('Wall tablet'), 'wall-tablet');
  assert.equal(slugify('  Camera di Chri — sera! '), 'camera-di-chri-sera');
  assert.equal(slugify('Città & Cucina'), 'citta-cucina');
  assert.equal(slugify('客厅'), '');
});

test('a long name suggests a slug cut to fit, never ending on a hyphen', () => {
  const slug = slugify(`${'a'.repeat(39)} b`);
  assert.equal(slug, 'a'.repeat(39));
  assert.equal(slugProblem(slugify('x'.repeat(100)), []), null);
});

test('a unique slug counts up from the base until one is free', () => {
  assert.equal(uniqueSlug('wall', []), 'wall');
  assert.equal(uniqueSlug('wall', ['wall']), 'wall-2');
  assert.equal(uniqueSlug('wall', ['wall', 'wall-2']), 'wall-3');
  assert.equal(uniqueSlug('Wall tablet', ['wall-tablet']), 'wall-tablet-2');
  assert.equal(uniqueSlug('客厅', []), 'dashboard');
});

test('a unique slug still fits when the count is added', () => {
  const long = 'a'.repeat(SLUG_MAX);
  const slug = uniqueSlug(long, [long]);
  assert.equal(slug, `${'a'.repeat(SLUG_MAX - 2)}-2`);
  assert.equal(slugProblem(slug, [long]), null);
});
