/**
 * The root of the renderer and of the Builder, localised (#59): it sets the
 * page's locale for everything it renders, and returns the `lang`, `dir`
 * and font its root element takes.
 *
 * Called in the root's own render, so the locale is set before any child
 * renders; the root re-renders when the viewer's locale changes, and with
 * it everything it draws. The portal root, where @hakit's dialog and our
 * own overlays are mounted outside the root element, is given the same
 * `lang`, `dir` and font. A script face is loaded the first time a
 * language needs it (`fonts.ts`): a `@font-face` inside a shadow root is
 * ignored, so the stylesheet goes in the document's head, as Geist's does.
 */
import { useEffect, type CSSProperties } from 'react';
import { usePortalRoot, useViewerLocale } from '../ha';
import { CASA } from '../theme/tokens';
import { scriptFont } from './fonts';
import { setViewerLocale, viewerDirection, viewerLanguage, type Language } from './index';

export type Localised = { lang: Language; dir: 'ltr' | 'rtl'; style: CSSProperties };

/** Casa Panel's stack with the script's face after Geist, so Latin stays in Geist. */
function fontStack(language: Language): string {
  const face = scriptFont(language);
  if (!face) return CASA.font.sans;
  const [first, ...rest] = CASA.font.sans.split(',');
  return [first, `"${face.family}"`, ...rest].join(',');
}

/** An element outside the root (the portal root) given the root's `lang`, `dir` and font. */
function localise(node: HTMLElement, lang: Language, dir: 'ltr' | 'rtl', font: string) {
  node.setAttribute('lang', lang);
  node.setAttribute('dir', dir);
  node.style.setProperty('--font-sans', font);
  node.style.setProperty('font-family', font);
}

export function useLocalised(): Localised {
  setViewerLocale(useViewerLocale());
  const lang = viewerLanguage();
  const dir = viewerDirection();
  const font = fontStack(lang);
  const portalRoot = usePortalRoot();

  useEffect(() => {
    const face = scriptFont(lang);
    if (face && !document.head.querySelector(`link[href="${face.href}"]`)) {
      document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: face.href }));
    }
  }, [lang]);

  useEffect(() => localise(portalRoot, lang, dir, font), [portalRoot, lang, dir, font]);

  return { lang, dir, style: { '--font-sans': font, fontFamily: font } as CSSProperties };
}
