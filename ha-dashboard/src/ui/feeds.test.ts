/**
 * The camera Page's pure half (#29): which Feed is big, what each caption
 * says, and the retry countdown.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bigCamera, feedStatus, secondsLeft } from './feeds';
import { DEFAULT_LOCALE, setViewerLocale } from '../i18n';

// In Italian, the copy of the house the panel was built for (#59).
setViewerLocale({ ...DEFAULT_LOCALE, language: 'it' });

const cams = (...list: [string, boolean][]) => list.map(([id, moving]) => ({ id, moving }));

test('until one is tapped, the big Feed is the first camera with motion', () => {
  assert.equal(bigCamera(cams(['a', false], ['b', true], ['c', true]), null), 'b');
});

test('with no motion anywhere, the big Feed is the first camera', () => {
  assert.equal(bigCamera(cams(['a', false], ['b', false]), null), 'a');
});

test('the camera last tapped is big, motion elsewhere notwithstanding', () => {
  assert.equal(bigCamera(cams(['a', true], ['b', false]), 'b'), 'b');
});

test('a tapped camera no longer Placed falls back to the usual choice', () => {
  assert.equal(bigCamera(cams(['a', false], ['b', true]), 'gone'), 'b');
});

test('no cameras, no big Feed', () => {
  assert.equal(bigCamera([], null), null);
});

test('the status line, one state at a time', () => {
  assert.deepEqual(feedStatus('live', false), { text: 'In diretta', tone: 'quiet' });
  assert.deepEqual(feedStatus('connecting', false), { text: 'Connessione…', tone: 'quiet' });
  assert.deepEqual(feedStatus('failed', false), { text: 'Riconnessione…', tone: 'quiet' });
  assert.deepEqual(feedStatus('unavailable', false), { text: 'Non disponibile', tone: 'fault' });
  assert.deepEqual(feedStatus('unsupported', false), { text: 'Nessun video', tone: 'quiet' });
});

test('motion is said over a live picture, and over a camera with no video at all', () => {
  assert.deepEqual(feedStatus('live', true), { text: 'Movimento', tone: 'motion' });
  assert.deepEqual(feedStatus('unsupported', true), { text: 'Movimento', tone: 'motion' });
});

test('motion does not hide that the picture is not there yet, or is a Fault', () => {
  assert.equal(feedStatus('connecting', true).text, 'Connessione…');
  assert.equal(feedStatus('failed', true).text, 'Riconnessione…');
  assert.equal(feedStatus('unavailable', true).text, 'Non disponibile');
});

test('the countdown counts whole seconds down to the retry, never below zero', () => {
  assert.equal(secondsLeft(10_000, 5_000), 5);
  assert.equal(secondsLeft(10_000, 5_001), 5);
  assert.equal(secondsLeft(10_000, 9_000), 1);
  assert.equal(secondsLeft(10_000, 10_000), 0);
  assert.equal(secondsLeft(10_000, 12_000), 0);
});
