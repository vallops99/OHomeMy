/**
 * The Clock's text (#41): the time and the Italian date, as the status bar
 * shows them.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clockText, msToNextMinute } from './clock';
import { DEFAULT_LOCALE, setViewerLocale } from '../i18n';

// In Italian, the copy of the house the panel was built for (#59).
setViewerLocale({ ...DEFAULT_LOCALE, language: 'it' });

test('the time is hours and minutes, 24-hour, zero-padded', () => {
  assert.equal(clockText(new Date(2026, 9, 5, 9, 4, 30)).time, '09:04');
  assert.equal(clockText(new Date(2026, 9, 5, 21, 45)).time, '21:45');
});

test('the date is the Italian weekday, day and month, capitalised', () => {
  assert.equal(clockText(new Date(2026, 9, 5, 9, 4)).date, 'Lunedì 5 ottobre');
  assert.equal(clockText(new Date(2026, 0, 1, 0, 0)).date, 'Giovedì 1 gennaio');
});

test('the next tick lands on the next minute', () => {
  assert.equal(msToNextMinute(new Date(2026, 9, 5, 9, 4, 30, 250)), 29_750);
  // Exactly on the minute: a whole minute to wait, never zero.
  assert.equal(msToNextMinute(new Date(2026, 9, 5, 9, 4, 0, 0)), 60_000);
});
