/**
 * The strings module (#59, ADR-0015 "Language and themes"): every word
 * OHomeMy shows, in the viewer's language, and every number, time and date
 * in their formats.
 *
 * The viewer is whoever is logged in to Home Assistant here: one per page,
 * so the locale is held once, for the page, rather than passed down. The
 * root of the renderer and of the Builder sets it (`useLocalised`) on every
 * render, before anything below it renders, and re-renders the tree when it
 * changes; the functions below read it at the moment a word is written.
 * Pure code (a chip's text, a Room Tile's meta line) calls them like any
 * other function, and a test sets the locale it wants with
 * `setViewerLocale`.
 *
 * - `tr(key, values)`: a message from the catalogues (`messages/`), English
 *   being the source and the fallback, key by key.
 * - `fmt.*`: the viewer's number, time and date formats (`format.ts`).
 *
 * Text an admin writes (a Widget's title, a Page's name) never comes through
 * here: it is shown as written. Only a Widget's Default title does.
 */
import {
  DEFAULT_LOCALE,
  formatDateTime,
  formatLongDate,
  formatNumber,
  formatPercent,
  formatTime,
  formatWeekday,
  type ViewerLocale,
} from './format';
import { directionOf, pickLanguage, translate, type Key, type Language, type Params } from './translate';

export { DEFAULT_LOCALE, type ViewerLocale } from './format';
export { directionOf, isKey, pickLanguage, LANGUAGES, type Key, type Language } from './translate';
export { scriptFont } from './fonts';

let locale: ViewerLocale = DEFAULT_LOCALE;
let language: Language = 'en';

/** Speaks to the viewer this locale describes from now on. */
export function setViewerLocale(next: ViewerLocale) {
  locale = next;
  language = pickLanguage(next.language);
}

export const viewerLocale = () => locale;
/** The catalogue's language, which is also what `dir` and `lang` follow. */
export const viewerLanguage = () => language;

/** The message for `key`, in the viewer's language, its numbers in their format. */
export function tr<K extends Key>(key: K, ...params: Params<K>): string {
  return translate(language, key, params[0] as Record<string, string | number> | undefined, n => formatNumber(locale, n));
}

/**
 * `tr` for a key made from data (`state.${state}`), which the compiler
 * cannot check the values of. Check it with `isKey` first.
 */
export function trKey(key: Key, values?: Record<string, string | number>): string {
  return translate(language, key, values, n => formatNumber(locale, n));
}

/** The viewer's formats. */
export const fmt = {
  number: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(locale, value, options),
  /** One decimal at most: `20.5`, `20` (`20,5` in Italian). */
  reading: (value: number) => formatNumber(locale, value, { maximumFractionDigits: 1 }),
  /** Exactly one decimal and a degree sign, `20.0°`, as a room's temperature is written. */
  degrees: (value: number) => `${formatNumber(locale, value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}°`,
  /** Whole degrees, `21°`. */
  wholeDegrees: (value: number) => `${formatNumber(locale, Math.round(value))}°`,
  percent: (value: number) => formatPercent(locale, value),
  time: (date: Date) => formatTime(locale, date),
  longDate: (date: Date) => formatLongDate(locale, date),
  weekday: (date: Date) => formatWeekday(locale, date),
  dateTime: (date: Date) => formatDateTime(locale, date),
  /** `a, b and c` (`or` for `disjunction`), as the viewer's language joins a list. */
  list: (items: readonly string[], type: 'conjunction' | 'disjunction' = 'conjunction') =>
    new Intl.ListFormat(language, { type }).format(items),
  /** Sorting names as the viewer's language sorts them. */
  compare: (a: string, b: string) => a.localeCompare(b, locale.language, { sensitivity: 'base' }),
};

/** `rtl` while the viewer reads Arabic. */
export const viewerDirection = () => directionOf(language);
