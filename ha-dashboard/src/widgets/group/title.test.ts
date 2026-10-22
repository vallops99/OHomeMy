/**
 * A Group's title (ADR-0017, CONTEXT.md "Group"): only what someone wrote.
 * It has no Default title, whatever its Members' Domains.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_LOCALE, setViewerLocale } from '../../i18n';
import { groupTitle } from './title';

test('a Group with no title written shows none', () => {
  assert.equal(groupTitle(null), undefined);
  assert.equal(groupTitle(''), undefined);
});

test('a title someone wrote is shown as written, whoever is looking', () => {
  for (const language of ['en', 'it', 'ar', 'hi', 'zh-Hans', 'es']) {
    setViewerLocale({ ...DEFAULT_LOCALE, language });
    assert.equal(groupTitle('Cancelli di casa'), 'Cancelli di casa');
  }
  setViewerLocale(DEFAULT_LOCALE);
});
