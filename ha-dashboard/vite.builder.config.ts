/**
 * The Builder's build (#55): one ES module defining `<ohomemy-builder>`,
 * built exactly as the Dashboard's panel is (`vite.panel.config.ts`).
 *
 *     npm run build:builder   ->  dist-builder/ohomemy-builder.js (+ chunks)
 *
 * Run with `--mode panel` for the same reason: `.env.development`'s token
 * must never reach a bundle Home Assistant serves.
 */
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { emotionIntoShadowRoot } from './vite.panel.config.ts';

export default defineConfig({
  plugins: [react(), emotionIntoShadowRoot()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist-builder',
    emptyOutDir: true,
    lib: {
      entry: 'src/builder/main.tsx',
      formats: ['es'],
      fileName: () => 'ohomemy-builder.js',
    },
  },
});
