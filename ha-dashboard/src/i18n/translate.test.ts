/**
 * Looking a message up (#59): which language a viewer gets, the fallback to
 * English key by key, plural forms and filled-in values.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_LOCALE } from './format';
import { fmt, setViewerLocale, tr, viewerDirection, viewerLanguage } from './index';
import { CATALOGUES, interpolate, pickLanguage, translate } from './translate';

test("a viewer gets their own language, their region's base, or English", () => {
  assert.equal(pickLanguage('it'), 'it');
  assert.equal(pickLanguage('es-419'), 'es');
  assert.equal(pickLanguage('en-GB'), 'en');
  assert.equal(pickLanguage('ar'), 'ar');
  assert.equal(pickLanguage('hi'), 'hi');
  assert.equal(pickLanguage('zh-Hans'), 'zh-Hans');
  assert.equal(pickLanguage('zh-CN'), 'zh-Hans');
  assert.equal(pickLanguage('de'), 'en');
  assert.equal(pickLanguage(undefined), 'en');
});

test('Traditional Chinese is not given Simplified', () => {
  assert.equal(pickLanguage('zh-Hant'), 'en');
  assert.equal(pickLanguage('zh-TW'), 'en');
});

test('a key a catalogue lacks is said in English, and the rest stays translated', () => {
  const it = CATALOGUES.it as Record<string, unknown>;
  const saved = it['roomGrid.allOff'];
  delete it['roomGrid.allOff'];
  try {
    assert.equal(translate('it', 'roomGrid.allOff', undefined), 'All off');
    assert.equal(translate('it', 'roomGrid.title', undefined), 'Stanze');
  } finally {
    it['roomGrid.allOff'] = saved;
  }
});

test('values are filled in by name, and numbers through the formatter', () => {
  assert.equal(translate('en', 'camera.show', { name: 'Ingresso' }), 'Show Ingresso');
  assert.equal(
    interpolate('{a} and {b}', { a: 1234, b: 'x' }, n => `#${n}`),
    '#1234 and x'
  );
  assert.equal(interpolate('{missing}', {}), '{missing}', 'a value not given stays visible');
});

test('the plural form follows the language’s own rules', () => {
  assert.equal(translate('en', 'chips.fault', { count: 1 }), '1 fault');
  assert.equal(translate('en', 'chips.fault', { count: 3 }), '3 faults');
  assert.equal(translate('en', 'chips.fault', { count: 0 }), '0 faults');
  assert.equal(translate('it', 'chips.fault', { count: 1 }), '1 guasto');
  assert.equal(translate('it', 'chips.fault', { count: 2 }), '2 guasti');
  // Arabic has six forms: one and two are words, 3-10 take the plural, 11-99 the singular accusative.
  assert.equal(translate('ar', 'chips.fault', { count: 1 }), 'عطل واحد');
  assert.equal(translate('ar', 'chips.fault', { count: 2 }), 'عطلان');
  assert.equal(translate('ar', 'chips.fault', { count: 5 }), '5 أعطال');
  assert.equal(translate('ar', 'chips.fault', { count: 11 }), '11 عطلًا');
  assert.equal(translate('ar', 'chips.fault', { count: 100 }), '100 عطل');
  // Hindi's "one" is 0 and 1.
  assert.equal(translate('hi', 'chips.cameras', { count: 0 }), '0 कैमरा');
  assert.equal(translate('zh-Hans', 'chips.cameras', { count: 1 }), '1 个摄像头');
});

test('tr speaks the viewer’s language, with numbers in their digits', () => {
  try {
    setViewerLocale({ ...DEFAULT_LOCALE, language: 'it-IT' });
    assert.equal(viewerLanguage(), 'it');
    assert.equal(tr('roomTile.lightsOn', { count: 2 }), '2 luci accese');
    assert.equal(viewerDirection(), 'ltr');

    setViewerLocale({ ...DEFAULT_LOCALE, language: 'ar' });
    assert.equal(viewerDirection(), 'rtl');
    assert.equal(tr('chips.fault', { count: 5 }), `${fmt.number(5)} أعطال`);
    assert.equal(fmt.number(5), new Intl.NumberFormat('ar').format(5));

    setViewerLocale({ ...DEFAULT_LOCALE, language: 'ar', number_format: 'comma_decimal' });
    assert.equal(tr('chips.fault', { count: 5 }), '5 أعطال', "the number format is the viewer's, whatever their language");
  } finally {
    setViewerLocale(DEFAULT_LOCALE);
  }
});
