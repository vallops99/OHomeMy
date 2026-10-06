/**
 * The panel build (#46): one ES module defining `<ohomemy-dashboard>`, for
 * Home Assistant to load as a `panel_custom` with `embed_iframe: false`.
 * `vite.config.ts` stays the build of the standalone page.
 *
 *     npm run build:panel     ->  dist-panel/ohomemy-dashboard.js (+ chunks)
 *
 * Run with `--mode panel`, so `.env.development`'s token is never read into
 * a bundle that Home Assistant serves to every user.
 */
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const EMOTION_CACHE = fileURLToPath(new URL('./src/panel/emotionCache.ts', import.meta.url));

/**
 * Hands every importer of `@emotion/cache` -- ours, @emotion/react's and the
 * private copies bundled inside @hakit -- `src/panel/emotionCache.ts`
 * instead, which sends all emotion output into the Dashboard's shadow root.
 * That module itself still gets the real package.
 */
function emotionIntoShadowRoot(): Plugin {
  return {
    name: 'ohomemy:emotion-into-shadow-root',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '@emotion/cache' && importer?.split('?')[0] !== EMOTION_CACHE) return EMOTION_CACHE;
    },
  };
}

export default defineConfig({
  plugins: [react(), emotionIntoShadowRoot()],
  // Library mode leaves `process.env.NODE_ENV` for the consumer to replace;
  // Home Assistant is the consumer and replaces nothing.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist-panel',
    emptyOutDir: true,
    lib: {
      entry: 'src/panel/main.tsx',
      formats: ['es'],
      fileName: () => 'ohomemy-dashboard.js',
    },
  },
});
