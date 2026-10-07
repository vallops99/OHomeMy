/**
 * The rules every OHomeMy stylesheet needs for the viewer's script (#59):
 * the renderer's (`renderer/grid.ts`) and the Builder's (`builder/main.tsx`)
 * each put them in their shadow root, from here, so the two cannot drift.
 *
 * - Tracking pulls Arabic's joined letters apart and breaks Devanagari's
 *   headstroke: those scripts are set as their faces draw them.
 * - A name or a title from Home Assistant or the admin runs in its own
 *   direction (`dir="auto"`), so a Latin name in an Arabic tile is cut at
 *   its end, not its start; it still lines up with the words around it.
 */
export const SCRIPT_CSS = `
  :lang(ar), :lang(hi) { letter-spacing: 0 !important; }
  :dir(rtl) > [dir='auto'] { text-align: right; }
  :dir(ltr) > [dir='auto'] { text-align: left; }
`;
