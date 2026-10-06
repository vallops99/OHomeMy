/**
 * A Feed's caption (#53): a Fault outranks motion, and motion is said only
 * over a picture, or where no picture will ever come.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { feedStatus } from './status';

test('an Unavailable camera says so, as a Fault, whatever it sees', () => {
  assert.deepEqual(feedStatus('unavailable', true), { text: 'Unavailable', tone: 'fault' });
});

test('motion is not said over a picture that is not there yet', () => {
  assert.equal(feedStatus('connecting', true).text, 'Connecting…');
  assert.equal(feedStatus('failed', true).text, 'Reconnecting…');
});

test('motion over a live picture, or a camera with no live stream', () => {
  assert.deepEqual(feedStatus('live', true), { text: 'Motion', tone: 'motion' });
  assert.deepEqual(feedStatus('unsupported', true), { text: 'Motion', tone: 'motion' });
});

test('otherwise live, or no video', () => {
  assert.equal(feedStatus('live', false).text, 'Live');
  assert.equal(feedStatus('unsupported', false).text, 'No video');
});
