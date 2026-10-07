import { defineWidget } from '../types';
import { IndoorReadingWidget } from './IndoorReadingWidget';
import { indoorReadingSchema } from './schema';

export default defineWidget({
  schema: indoorReadingSchema,
  Component: IndoorReadingWidget,
  // Nothing happens on a tap, so an `on_tap` makes the whole reading a way
  // to its Page, as the label-driven Dashboard's indoor reading led to the
  // thermostat's (#32).
  tap: 'none',
  // `full` stacks title, number and humidity, as `ui/Hero.tsx` (the lines
  // dissolve into the grid, the title ordered first); `compact` puts the
  // number beside the two lines. The number takes the height the lines
  // leave it, never above Casa Panel's `temp-hero` (144 px on the wall) nor
  // below a size still read from across a room. The -1/24 em is the
  // design's optical correction (-6 at 144 px): a big "2" carries its own
  // side bearing, which would set it in from the title. The floors stay
  // lengths: they are what reads across a room, which no type style names.
  // The humidity takes `body-lg`, the type style nearest the 18 px it was.
  css: `
    .ohm-indoor_reading {
      height: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-content: center;
      row-gap: var(--space-1);
      color: var(--ink);
      white-space: nowrap;
    }
    .ohm-indoor_reading-lines { display: contents; }
    .ohm-indoor_reading-title { order: -1; }
    .ohm-indoor_reading-title,
    .ohm-indoor_reading-humidity {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
      overflow: hidden;
    }
    .ohm-indoor_reading-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .ohm-indoor_reading-title {
      font-size: var(--type-body-size);
      color: var(--ink-muted);
    }
    .ohm-indoor_reading-humidity {
      font-size: var(--type-body-lg-size);
      color: var(--ink-secondary);
    }
    .ohm-indoor_reading-icon { display: flex; flex-shrink: 0; color: var(--ink-muted); }
    .ohm-indoor_reading [data-fault],
    .ohm-indoor_reading [data-fault] .ohm-indoor_reading-icon { color: var(--alert); }
    .ohm-indoor_reading-number {
      font-size: clamp(40px, min(calc(100cqh - 60px), 50cqw), var(--type-temp-hero-size));
      line-height: var(--type-temp-hero-line);
      font-weight: var(--type-temp-hero-weight);
      letter-spacing: var(--type-temp-hero-tracking);
      margin-inline-start: -0.0417em;
    }
    .ohm-indoor_reading-number[data-fault] { color: var(--ink-muted); }
    .ohm-indoor_reading[data-variant='compact'] {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }
    .ohm-indoor_reading[data-variant='compact'] .ohm-indoor_reading-lines {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      min-width: 0;
    }
    .ohm-indoor_reading[data-variant='compact'] .ohm-indoor_reading-number {
      font-size: clamp(32px, min(85cqh, 30cqw), var(--type-temp-hero-size));
    }
    /* A narrow strip keeps the words and lets the icons go. */
    @container widget (max-width: 220px) {
      .ohm-indoor_reading[data-variant='compact'] .ohm-indoor_reading-icon { display: none; }
    }
  `,
});
