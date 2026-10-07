/**
 * Who is looking, as far as words go (#59): the language and the formats of
 * the Home Assistant user this page is logged in as.
 *
 * Inside Home Assistant the panel element is handed `hass`, and its
 * `hass.locale` is the frontend's own answer: the language from the user's
 * profile (their frontend user data, `language`), or, for a user who never
 * chose one, the browser's, and each format setting. The element keeps only
 * that and the server's time zone (`panel/panelProps.ts`). On the dev
 * server there is no element, so the same user data is read through
 * @hakit, which subscribes to it, and the browser's language stands in for
 * a user who never chose one, as Home Assistant's own frontend does.
 */
import { locales, useHass, useLocaleData, type Locales } from '@hakit/core';
import { useMemo } from 'react';
import { DEFAULT_LOCALE, type ViewerLocale } from '../i18n/format';
import { usePanelProps } from '../panel/panelProps';

/** What Home Assistant's frontend hands a panel as `hass.locale`, as far as OHomeMy reads it. */
export type HassLocale = Partial<Omit<ViewerLocale, 'server_time_zone'>> & { language?: string };

/** The browser's own language: what Home Assistant falls back to for a user with none chosen. */
const browserLanguage = () => (typeof navigator === 'undefined' ? 'en' : (navigator.language ?? 'en'));

/** One `ViewerLocale` from whichever of Home Assistant's answers there is, each field defaulted. */
export function viewerLocaleOf(locale: HassLocale | null | undefined, serverTimeZone: string | null | undefined): ViewerLocale {
  return {
    ...DEFAULT_LOCALE,
    ...Object.fromEntries(Object.entries(locale ?? {}).filter(([, v]) => v !== undefined && v !== null)),
    language: locale?.language || browserLanguage(),
    server_time_zone: serverTimeZone ?? null,
  };
}

export function useViewerLocale(): ViewerLocale {
  const { locale: fromPanel, timeZone: panelZone } = usePanelProps();
  const userData = useLocaleData();
  const serverZone = useHass(s => s.config?.time_zone);
  const locale = (fromPanel ?? userData) as HassLocale | null;
  const zone = panelZone ?? serverZone ?? null;
  return useMemo(() => viewerLocaleOf(locale, zone), [locale, zone]);
}

/**
 * The language @hakit's own surfaces (its entity dialog) are given: the
 * viewer's, by its code in @hakit's list, else its base language's, else
 * English. Never a code @hakit lacks: it then renders nothing at all.
 */
export function hakitLanguage(language: string): Locales {
  const codes = locales.map(l => l.code);
  const lower = language.toLowerCase();
  const found = codes.find(c => c.toLowerCase() === lower) ?? codes.find(c => c.toLowerCase() === lower.split('-')[0]);
  return (found ?? 'en') as Locales;
}

/**
 * @hakit's language for this viewer, from Home Assistant's `hass.locale`;
 * `undefined` until the panel has it, and on the dev server, where @hakit
 * then takes the server's own language.
 */
export function useHakitLocale(): Locales | undefined {
  const language = usePanelProps().locale?.language;
  return typeof language === 'string' && language ? hakitLanguage(language) : undefined;
}
