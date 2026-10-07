/**
 * Fallback faces for the scripts Casa Panel's Geist lacks (#59): Han for
 * Simplified Chinese, Devanagari for Hindi, Arabic. Each is Noto Sans, the
 * face made to sit beside a Latin sans, from Google Fonts as Geist is.
 *
 * A face is loaded only for a viewer whose language needs it: a Simplified
 * Chinese face is megabytes, and an Italian wall panel has no use for it.
 * It goes after Geist in the stack, so Latin text, digits and the names of
 * things stay in Geist and only the script falls through to it.
 */
import type { Language } from './translate';

const FACES: Partial<Record<Language, string>> = {
  'zh-Hans': 'Noto Sans SC',
  hi: 'Noto Sans Devanagari',
  ar: 'Noto Sans Arabic',
};

/** The face a language needs beside Geist, and the stylesheet that loads it; `null` for a Latin one. */
export function scriptFont(language: Language): { family: string; href: string } | null {
  const family = FACES[language];
  if (!family) return null;
  return {
    family,
    href: `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap`,
  };
}
