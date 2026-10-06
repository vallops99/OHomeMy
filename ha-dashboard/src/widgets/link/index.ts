import { defineWidget } from '../types';
import { LinkWidget } from './LinkWidget';
import { linkSchema } from './schema';

export default defineWidget({
  schema: linkSchema,
  Component: LinkWidget,
  // Only a way to a Page: the renderer opens its `on_tap` from the whole box,
  // and skips a Link that has none.
  tap: 'page',
  // `full` is a row; `compact` a block with the icon at the top and the
  // title at the bottom. A short box gives up its padding first.
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
    @container widget (max-height: 99px) {
      .ohm-link { padding: var(--space-2) var(--space-3); }
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
