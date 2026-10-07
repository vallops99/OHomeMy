/**
 * Looking a message up (#59): which of OHomeMy's languages a viewer gets,
 * the message for a key in it, its plural form and its `{placeholders}`
 * filled in.
 *
 * No library. What OHomeMy needs is a key, a few named values and the
 * plural form, and `Intl.PluralRules` already knows every language's plural
 * rules; an ICU message parser (FormatJS, i18next) would add tens of
 * kilobytes to every bundle to say the same. A message is either a string
 * or one string per plural category, which a translator writes as data.
 *
 * No React and no @hakit, so `translate.test.ts` runs it under plain Node.
 */
import { ar } from './messages/ar';
import { en } from './messages/en';
import { es } from './messages/es';
import { hi } from './messages/hi';
import { it } from './messages/it';
import { zhHans } from './messages/zh-Hans';

/** One string per plural category the language has (`Intl.PluralRules`); `other` always. */
export type Plural = { readonly zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
export type Message = string | Plural;

/** English is the source: every key is one of its keys. */
export type Key = keyof typeof en;

/** Whether `key` is one of the source's keys: for a key made from data, a state or a Domain. */
export const isKey = (key: string): key is Key => Object.hasOwn(en, key);

/** A translation: some or all of the source's keys. A key it lacks is said in English. */
export type Catalogue = { readonly [K in Key]?: Message };

/** The languages OHomeMy speaks, by Home Assistant's own codes. */
export const LANGUAGES = ['en', 'zh-Hans', 'hi', 'es', 'ar', 'it'] as const;
export type Language = (typeof LANGUAGES)[number];

export const CATALOGUES: Readonly<Record<Language, Catalogue>> = { en, 'zh-Hans': zhHans, hi, es, ar, it };

/** Codes for Simplified Chinese besides Home Assistant's own `zh-Hans`. */
const SIMPLIFIED = new Set(['zh-hans', 'zh-cn', 'zh-sg', 'zh-my']);

/**
 * The language a viewer is spoken to in: theirs when OHomeMy has it, by its
 * own code or its region's (`es-419` is `es`), else English. Traditional
 * Chinese is not Simplified: a `zh-Hant` reader gets English rather than a
 * script they did not choose.
 */
export function pickLanguage(code: string | null | undefined): Language {
  const lower = (code ?? '').toLowerCase();
  if (SIMPLIFIED.has(lower)) return 'zh-Hans';
  if (lower.startsWith('zh')) return 'en';
  const base = lower.split('-')[0];
  return (LANGUAGES as readonly string[]).includes(base) ? (base as Language) : 'en';
}

/** Arabic is the one of them written right to left. */
export const directionOf = (language: Language): 'ltr' | 'rtl' => (language === 'ar' ? 'rtl' : 'ltr');

/** The `{name}`s in a message, as a type, from the English source. */
type Holes<S> = S extends `${string}{${infer P}}${infer R}` ? P | Holes<R> : never;
type HolesOf<M> = M extends string ? Holes<M> : M extends Plural ? Holes<M[keyof M]> | 'count' : never;

/** What a key's message needs filled in: nothing, or each of its names. A plural one always takes `count`. */
export type Params<K extends Key> = [HolesOf<(typeof en)[K]>] extends [never]
  ? []
  : [values: Record<HolesOf<(typeof en)[K]>, string | number>];

type Values = Record<string, string | number>;

const pluralRules = new Map<Language, Intl.PluralRules>();
const rulesFor = (language: Language) => {
  let rules = pluralRules.get(language);
  if (!rules) pluralRules.set(language, (rules = new Intl.PluralRules(language)));
  return rules;
};

/** The form of `message` for `count` in `language`, falling back to `other`. */
function pluralForm(message: Plural, language: Language, count: number): string {
  return message[rulesFor(language).select(count) as keyof Plural] ?? message.other;
}

/**
 * The message for `key` in `language`, with its values filled in: a number
 * through `number`, so it is written in the viewer's own digits and
 * separators. A key the language lacks is said in English.
 */
export function translate(language: Language, key: Key, values: Values | undefined, number: (n: number) => string = String): string {
  const own = CATALOGUES[language][key];
  const [message, spoken] = own === undefined ? [en[key] as Message, 'en' as const] : [own, language];
  const text = typeof message === 'string' ? message : pluralForm(message, spoken, Number(values?.count ?? 0));
  return interpolate(text, values, number);
}

/** Each `{name}` replaced by its value; one with no value is left as it is, to be seen and fixed. */
export function interpolate(text: string, values: Values | undefined, number: (n: number) => string = String): string {
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (hole, name: string) => {
    const value = values[name];
    if (value === undefined) return hole;
    return typeof value === 'number' ? number(value) : value;
  });
}
