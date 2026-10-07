/**
 * The viewer's formats (#59): numbers, times and dates as their Home
 * Assistant profile asks, the way Home Assistant's own frontend writes them.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_LOCALE,
  formatDateTime,
  formatLongDate,
  formatNumber,
  formatPercent,
  formatTime,
  usesAmPm,
  type ViewerLocale,
} from './format';

const locale = (patch: Partial<ViewerLocale>): ViewerLocale => ({ ...DEFAULT_LOCALE, ...patch });
// 21:05 on Wednesday 7 October 2026, UTC.
const at = new Date(Date.UTC(2026, 9, 7, 21, 5));
const utc = (patch: Partial<ViewerLocale>) => locale({ time_zone: 'server', server_time_zone: 'UTC', ...patch });

test('numbers follow the language, or the format the viewer chose', () => {
  assert.equal(formatNumber(locale({ language: 'en' }), 1234.5), '1,234.5');
  assert.equal(formatNumber(locale({ language: 'it' }), 1234.5), '1234,5');
  assert.equal(formatNumber(locale({ language: 'en', number_format: 'decimal_comma' }), 1234.5), '1.234,5');
  assert.equal(formatNumber(locale({ language: 'it', number_format: 'comma_decimal' }), 1234.5), '1,234.5');
  assert.equal(formatNumber(locale({ language: 'en', number_format: 'none' }), 1234.5), '1234.5');
  assert.equal(formatNumber(locale({ language: 'hi' }), 123456), '1,23,456');
  // Arabic's digits are whichever the platform's CLDR gives `ar`, as in Home Assistant itself.
  assert.equal(formatNumber(locale({ language: 'ar' }), 20.5), new Intl.NumberFormat('ar').format(20.5));
});

test('a percentage is written as the language writes one', () => {
  assert.equal(formatPercent(locale({ language: 'en' }), 50), '50%');
  assert.equal(formatPercent(locale({ language: 'ar' }), 50), new Intl.NumberFormat('ar', { style: 'percent' }).format(0.5));
});

test('12 or 24 hours: as chosen, or as the language tells the time', () => {
  assert.equal(usesAmPm(locale({ language: 'en' })), true);
  assert.equal(usesAmPm(locale({ language: 'it' })), false);
  assert.equal(usesAmPm(locale({ language: 'it', time_format: 'am_pm' })), true);
  assert.equal(usesAmPm(locale({ language: 'en', time_format: '24' })), false);
});

test('the time is hours and minutes, in the zone the viewer chose', () => {
  assert.equal(formatTime(utc({ language: 'it' }), at), '21:05');
  assert.equal(formatTime(utc({ language: 'en' }), at), '9:05 PM');
  assert.equal(formatTime(utc({ language: 'en', time_format: '24' }), at), '21:05');
  assert.equal(formatTime(utc({ language: 'it' }), new Date(Date.UTC(2026, 9, 7, 9, 4))), '09:04');
  assert.equal(formatTime(utc({ language: 'it', server_time_zone: 'Europe/Rome' }), at), '23:05');
  assert.equal(formatTime(utc({ language: 'en', server_time_zone: 'Asia/Kolkata', time_format: '24' }), at), '02:35');
});

test('the Clock’s date is the language’s own, starting with a capital', () => {
  assert.equal(formatLongDate(utc({ language: 'it' }), at), 'Mercoledì 7 ottobre');
  assert.match(formatLongDate(utc({ language: 'en' }), at), /^Wednesday, October 7$/);
  assert.match(formatLongDate(utc({ language: 'es' }), at), /^Miércoles, 7 de octubre$/);
  assert.match(formatLongDate(utc({ language: 'zh-Hans' }), at), /10月7日/);
  assert.match(formatLongDate(utc({ language: 'hi' }), at), /बुधवार/);
});

test('a numeric date takes the order the viewer chose', () => {
  assert.equal(formatDateTime(utc({ language: 'en', time_format: '24' }), at), '10/07/2026, 21:05');
  assert.equal(formatDateTime(utc({ language: 'en', time_format: '24', date_format: 'DMY' }), at), '07/10/2026, 21:05');
  assert.equal(formatDateTime(utc({ language: 'it', date_format: 'YMD' }), at), '2026/10/07, 21:05');
});
