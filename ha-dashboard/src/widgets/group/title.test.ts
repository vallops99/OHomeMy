/**
 * Default titles (#59, CONTEXT.md "Default title"): unset, a Widget's title
 * is its kind's default in the viewer's language; set, it is exactly what
 * the admin wrote, in every language.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shownTitle } from '../../document/schema';
import { DEFAULT_LOCALE, setViewerLocale, tr } from '../../i18n';
import { groupDefaultTitle } from './title';

const viewing = (language: string) => setViewerLocale({ ...DEFAULT_LOCALE, language });

test("an unset title is the Default title, in each viewer's language", () => {
  const seen = (language: string) => (viewing(language), shownTitle(null, groupDefaultTitle('lock')));
  assert.equal(seen('en'), 'Locks');
  assert.equal(seen('it'), 'Accessi');
  assert.equal(seen('ar'), 'الأقفال');
  assert.equal(seen('hi'), 'लॉक');
  assert.equal(seen('zh-Hans'), '门锁');
  assert.equal(seen('es'), 'Cerraduras');
});

test('a title someone wrote is shown as written, whoever is looking', () => {
  for (const language of ['en', 'it', 'ar', 'hi', 'zh-Hans', 'es']) {
    viewing(language);
    assert.equal(shownTitle('Cancelli di casa', groupDefaultTitle('lock')), 'Cancelli di casa');
    assert.equal(shownTitle('', tr('roomGrid.title')), '', 'an empty title shows none');
  }
});

test('a Domain with no word of its own is a Group', () => {
  viewing('it');
  assert.equal(groupDefaultTitle('camera'), 'Gruppo');
  setViewerLocale(DEFAULT_LOCALE);
});
