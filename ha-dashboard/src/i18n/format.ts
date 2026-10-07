/**
 * Numbers, times and dates in the viewer's own formats (#59): the format
 * settings of their Home Assistant profile, applied the way Home
 * Assistant's own frontend applies them, so a reading on a Dashboard is
 * written as the same reading in Home Assistant.
 *
 * - `number_format`: `language` follows the language, `system` the
 *   browser, and the named ones a locale that writes them (`decimal_comma`
 *   is German's 1.234,5); `none` drops the grouping.
 * - `time_format`: 12 or 24 hours, or whichever the language (or the
 *   browser) uses.
 * - `date_format`: a written date (the Clock's) follows the language, or
 *   the browser for `system`; DMY, MDY and YMD order a numeric one.
 * - `time_zone`: the server's, or the device's own.
 *
 * No React and no @hakit, so `format.test.ts` runs it under plain Node.
 */

/** Home Assistant's `FrontendLocaleData`, with the server's time zone beside it. */
export type ViewerLocale = {
  /** The viewer's language, as Home Assistant has it: `it`, `zh-Hans`. */
  language: string;
  number_format: 'language' | 'system' | 'comma_decimal' | 'decimal_comma' | 'quote_decimal' | 'space_comma' | 'none';
  time_format: 'language' | 'system' | 'am_pm' | '24';
  date_format: 'language' | 'system' | 'DMY' | 'MDY' | 'YMD';
  time_zone: 'local' | 'server';
  /** The Home Assistant server's IANA zone, `null` until it is known. */
  server_time_zone: string | null;
};

/** What a viewer gets before Home Assistant has said: English, and the language's own formats. */
export const DEFAULT_LOCALE: ViewerLocale = {
  language: 'en',
  number_format: 'language',
  time_format: 'language',
  date_format: 'language',
  time_zone: 'local',
  server_time_zone: null,
};

/** A locale that writes numbers the way `number_format` names (Home Assistant's `numberFormatToLocale`). */
function numberLocale(locale: ViewerLocale): string | string[] | undefined {
  switch (locale.number_format) {
    case 'comma_decimal':
      return ['en-US', 'en'];
    case 'decimal_comma':
      return ['de', 'es', 'it'];
    case 'space_comma':
      return ['fr', 'sv', 'cs'];
    case 'quote_decimal':
      return ['de-CH'];
    case 'system':
      return undefined;
    default:
      return locale.language;
  }
}

export function formatNumber(locale: ViewerLocale, value: number, options: Intl.NumberFormatOptions = {}): string {
  const grouping = locale.number_format === 'none' ? { useGrouping: false } : {};
  return new Intl.NumberFormat(numberLocale(locale), { ...options, ...grouping }).format(value);
}

/** `50%` as the viewer writes it (`٥٠٪` in Arabic), from a 0-100 value. */
export const formatPercent = (locale: ViewerLocale, value: number) => formatNumber(locale, value / 100, { style: 'percent' });

/**
 * Whether times are written on a 12-hour clock: as the format says, or, for
 * `language` and `system`, as that language writes ten in the evening.
 */
export function usesAmPm(locale: ViewerLocale): boolean {
  if (locale.time_format === 'am_pm') return true;
  if (locale.time_format === '24') return false;
  const language = locale.time_format === 'language' ? locale.language : undefined;
  return new Intl.DateTimeFormat(language, { hour: 'numeric' }).resolvedOptions().hourCycle?.startsWith('h1') ?? false;
}

/** The IANA zone to write a time in, or `undefined` for the device's own. */
export const timeZoneOf = (locale: ViewerLocale): string | undefined =>
  locale.time_zone === 'server' && locale.server_time_zone ? locale.server_time_zone : undefined;

/** `09:04` or `9:04 AM`: hours and minutes, never seconds. */
export function formatTime(locale: ViewerLocale, date: Date): string {
  const amPm = usesAmPm(locale);
  return new Intl.DateTimeFormat(locale.time_format === 'system' ? undefined : locale.language, {
    hour: amPm ? 'numeric' : '2-digit',
    minute: '2-digit',
    hourCycle: amPm ? 'h12' : 'h23',
    timeZone: timeZoneOf(locale),
  }).format(date);
}

const dateLanguage = (locale: ViewerLocale) => (locale.date_format === 'system' ? undefined : locale.language);

/**
 * The Clock's date, `Monday 5 October` as the language writes it. A
 * language that writes the weekday in lower case (Italian, Spanish) has it
 * capitalised here, since it starts the line.
 */
export function formatLongDate(locale: ViewerLocale, date: Date): string {
  const text = new Intl.DateTimeFormat(dateLanguage(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timeZoneOf(locale),
  }).format(date);
  return text.charAt(0).toLocaleUpperCase(locale.language) + text.slice(1);
}

/** A short weekday, `Mon`, for a forecast day. */
export const formatWeekday = (locale: ViewerLocale, date: Date) =>
  new Intl.DateTimeFormat(dateLanguage(locale), { weekday: 'short', timeZone: timeZoneOf(locale) }).format(date);

/**
 * A numeric date and time, `10/07/2026, 9:04 PM`, joined as the language
 * joins them. DMY, MDY and YMD put the day, month and year in that order
 * with the language's own separator, as Home Assistant's
 * `formatDateNumeric` does.
 */
export function formatDateTime(locale: ViewerLocale, date: Date): string {
  const timeZone = timeZoneOf(locale);
  const numeric = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone } as const;
  const order = locale.date_format;
  if (order !== 'DMY' && order !== 'MDY' && order !== 'YMD') {
    const amPm = usesAmPm(locale);
    const time = { hour: amPm ? 'numeric' : '2-digit', minute: '2-digit', hourCycle: amPm ? 'h12' : 'h23' } as const;
    return new Intl.DateTimeFormat(dateLanguage(locale), { ...numeric, ...time }).format(date);
  }
  const parts = new Intl.DateTimeFormat(dateLanguage(locale), numeric).formatToParts(date);
  const value = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const separator = parts.find(p => p.type === 'literal')?.value ?? '/';
  const fields = { D: value('day'), M: value('month'), Y: value('year') };
  return `${[...order].map(f => fields[f as keyof typeof fields]).join(separator)}, ${formatTime(locale, date)}`;
}
