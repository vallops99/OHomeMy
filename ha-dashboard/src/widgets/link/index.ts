import { stepAt } from '../../ui/vars';
import { defineWidget } from '../types';
import { LinkWidget } from './LinkWidget';
import { linkSchema } from './schema';

/**
 * What a Link's content needs in height with its full padding, in px,
 * measured with `npm run fit` in every catalogue: the icon and the title,
 * side by side (`full`) or one over the other (`compact`), the padding and
 * the border. Below that plus the headroom, the padding tightens.
 */
const NEEDS = { full: 64, compact: 98 };

export default defineWidget({
  schema: linkSchema,
  Component: LinkWidget,
  smallest: { full: { width: 107, height: 55 }, compact: { width: 33, height: 25 } },
  // Only a way to a Page: the renderer opens its `on_tap` from the whole box,
  // and skips a Link that has none.
  tap: 'page',
  steps: [
    { name: 'full padding', variants: ['full'], box: { width: 300, height: stepAt(NEEDS.full) }, guards: 'height' },
    { name: 'full padding', variants: ['compact'], box: { width: 200, height: stepAt(NEEDS.compact) }, guards: 'height' },
  ],
  // `full` is a row; `compact` a block with the icon at the top and the
  // title at the bottom. A short box gives up its padding first, where the
  // padded content (`NEEDS`) no longer has the headroom to spare.
  css: `
    .ohm-link {
      flex: 1;
      align-self: stretch;
      min-width: 0;
      box-sizing: border-box;
      padding: var(--space-4);
      border: 1px solid var(--line-tile);
      border-radius: var(--radius-tile);
      background: var(--surface-tile);
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      grid-template-areas: 'icon title chevron';
      align-items: center;
      gap: var(--space-2) var(--space-3);
    }
    @container widget (height < ${stepAt(NEEDS.full)}px) {
      .ohm-link[data-variant='full'] { padding: var(--space-2) var(--space-3); }
    }
    @container widget (height < ${stepAt(NEEDS.compact)}px) {
      .ohm-link[data-variant='compact'] { padding: var(--space-2) var(--space-3); }
    }
    .ohm-link[data-variant='compact'] {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'icon' 'title';
      align-content: space-between;
      align-items: start;
    }
    .ohm-link-icon { grid-area: icon; display: flex; color: var(--ink-secondary); }
    .ohm-link-title {
      grid-area: title;
     
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: var(--type-tile-title-size);
      line-height: var(--type-tile-title-line);
      font-weight: var(--type-tile-title-weight);
      letter-spacing: var(--type-tile-title-tracking);
      color: var(--ink);
    }
    .ohm-link-chevron { grid-area: chevron; display: flex; color: var(--ink-muted); }
  `,
});
