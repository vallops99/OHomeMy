/**
 * `@emotion/cache`, as the panel build sees it (`vite.panel.config.ts`).
 *
 * Every emotion cache on the page is made through here, so every style goes
 * into the Dashboard's shadow root rather than `document.head`, where it
 * reaches nothing inside Home Assistant's shadow DOM. A `CacheProvider`
 * cannot do this: `@hakit/core` and `@hakit/components` each bundle a private
 * copy of emotion's cache context, whose default cache only a `CacheProvider`
 * from that same copy could replace, and @hakit's ThemeProvider names
 * `document.head` outright. What every copy shares is this import.
 *
 * - `container`: the tree's `styles` node, whatever the caller asked for.
 * - `speedy: false`: emotion's production mode writes rules with
 *   `insertRule`, and a `<style>` loses those the moment it is moved, which
 *   the tree is on every remount. Text nodes move with it.
 * - `hostSelectors` first, so prefixed copies of a rule are re-aimed too.
 */
import createEmotionCache, { type Options } from '@emotion/cache';
import { prefixer } from 'stylis';
import { hostSelectors } from './hostSelectors';
import { styles } from './tree';

export default function createCache(options: Options) {
  return createEmotionCache({
    ...options,
    container: styles,
    speedy: false,
    // Emotion's own default is `[prefixer]`; passing a list replaces it.
    stylisPlugins: [hostSelectors, ...(options.stylisPlugins ?? [prefixer])],
  });
}
