/**
 * The Link (CONTEXT.md): a Widget that opens a Page when tapped, and does
 * nothing else. The Page is the Widget's own `on_tap`, which every Widget
 * has; a Link without one is skipped (`tap: 'page'` in `index.ts`).
 *
 * - `full`: a row, the icon, the title and a chevron.
 * - `compact`: a block, the icon at the top and the title at the bottom, as
 *   a room tile lines them up.
 *
 * Its Default title is the name of the Page it opens.
 */
import { defineSchema } from '../../document/schema';

export const linkSchema = defineSchema({
  kind: 'link',
  variants: ['full', 'compact'],
  titled: true,
  settings: {
    /** Unset, an arrow. */
    icon: { type: 'icon', optional: true },
  },
});
