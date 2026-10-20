import { EntityWidget } from '../shared/EntityWidget';
import { defineWidget } from '../types';
import { mediaSchema } from './schema';

export default defineWidget({
  schema: mediaSchema,
  Component: EntityWidget,
  smallest: { full: { width: 144, height: 233 }, compact: { width: 117, height: 77 } },
  // `MediaCard`'s one row (artwork, title, volume, transport, power) needs
  // about 700 px; in a narrower box it folds in two, the artwork and the
  // title over the volume and the buttons, as it does on a phone. On every
  // Widget box, so a player in a Group's card folds too, and set both ways,
  // so a wide box never inherits the page root's fold (`HakitTheme`).
  //
  // 700 is a look choice, not a fit edge (#72): the row's flexible parts
  // shrink and its title ends in an ellipsis well below it, so nothing
  // stops fitting there; it is where a row reads worse than two lines.
  css: `
    .ohm-widget > * {
      --ohm-media-wrap: nowrap;
      --ohm-media-text-flex: 1;
      --ohm-media-volume-flex: 0 0 180px;
    }
    @container widget (max-width: 699px) {
      .ohm-widget > * {
        --ohm-media-wrap: wrap;
        --ohm-media-text-flex: 1 1 calc(100% - 64px - var(--space-4));
        --ohm-media-volume-flex: 1;
      }
    }
  `,
});
