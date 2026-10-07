/**
 * Every catalogue says exactly what the English source says (#59): the same
 * keys, no more and no fewer; a plural message where the source has one,
 * in the plural forms its language has; and the same `{values}`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { en } from './messages/en';
import { CATALOGUES, LANGUAGES, type Message } from './translate';

const holes = (text: string) => new Set([...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]));
const textsOf = (message: Message) => (typeof message === 'string' ? [message] : Object.values(message));
const holesOf = (message: Message) => new Set(textsOf(message).flatMap(t => [...holes(t)]));

for (const language of LANGUAGES.filter(l => l !== 'en')) {
  const catalogue = CATALOGUES[language] as Record<string, Message>;

  test(`${language} has exactly the source's keys`, () => {
    const missing = Object.keys(en).filter(k => !(k in catalogue));
    const extra = Object.keys(catalogue).filter(k => !(k in en));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
  });

  test(`${language}'s plurals are in its own plural forms`, () => {
    const categories = new Set(new Intl.PluralRules(language).resolvedOptions().pluralCategories as string[]);
    for (const [key, source] of Object.entries(en) as [string, Message][]) {
      const message = catalogue[key];
      if (message === undefined) continue;
      assert.equal(typeof message, typeof source, `${key}: a plural in English is a plural in ${language}, and only then`);
      if (typeof message === 'string') continue;
      assert.ok('other' in message, `${key} has an "other" form`);
      for (const form of Object.keys(message)) assert.ok(categories.has(form), `${key}: ${language} has no "${form}" form`);
    }
  });

  test(`${language} fills in the source's values and no others`, () => {
    for (const [key, source] of Object.entries(en) as [string, Message][]) {
      const message = catalogue[key];
      if (message === undefined) continue;
      const wanted = holesOf(source);
      if (typeof message === 'string') {
        assert.deepEqual(holes(message), wanted, key);
      } else {
        // A plural form may leave the count unsaid: Arabic's "one fault" is a word, not a number.
        for (const text of textsOf(message)) for (const h of holes(text)) assert.ok(wanted.has(h) || h === 'count', `${key}: {${h}}`);
      }
    }
  });
}

test('the source has every plural form English uses', () => {
  for (const [key, message] of Object.entries(en) as [string, Message][]) {
    if (typeof message !== 'string') assert.deepEqual(Object.keys(message).sort(), ['one', 'other'], key);
  }
});
