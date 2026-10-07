/**
 * The Builder's names looked up from data (#59): a kind, a setting or a
 * Theme with a word is said in it; one without is named from its id.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_LOCALE, setViewerLocale } from '../i18n';
import { dashboardUrl, discards, kindName, settingName, wordFor } from './words';

test('a kind or setting with a word is said in the viewer’s language', () => {
  setViewerLocale(DEFAULT_LOCALE);
  assert.equal(kindName('room_tile'), 'Room Tile');
  assert.equal(settingName('members'), 'Members');
  assert.equal(wordFor('builder.dashboard.settings.theme', 'casa-panel'), 'Casa Panel');
});

test('one with no word is named from its id', () => {
  setViewerLocale(DEFAULT_LOCALE);
  assert.equal(kindName('garden_hose'), 'Garden hose');
  assert.equal(settingName('flow_rate'), 'Flow rate');
  assert.equal(wordFor('builder.dashboard.settings.theme', 'neon'), undefined);
});

test('a question discards the Draft only when there is one, and an address is the same in every language', () => {
  setViewerLocale(DEFAULT_LOCALE);
  assert.equal(discards(false), '');
  assert.match(discards(true), /^ \S/);
  assert.equal(dashboardUrl('wall'), '/ohomemy-wall');
});
