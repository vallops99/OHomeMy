import { stepAt } from '../../ui/vars';
import { defineWidget, type LayoutStep } from '../types';
import { ToggleWidget } from './ToggleWidget';
import { toggleSchema } from './schema';

/**
 * What a Toggle's content needs in height at each of its steps, in px,
 * measured with `npm run fit` in every catalogue (the widest of them): the
 * icon, the text (title over state line), the dimmer, the padding and the
 * border. Each step gives way to the next denser one at its own content
 * plus the headroom (`stepAt`).
 */
const NEEDS = {
  /** `full`, the dimmer beside the text, with the full padding. */
  padded: 90,
  /** The same, with the tight padding. */
  dimmer: 74,
  /** `full` under `FOLD_W`: the dimmer folded under the text, full padding. */
  folded: 148,
  /** No dimmer: icon and text, tight padding. */
  stated: 68,
  /** `compact`: the icon over the text, full padding. */
  compactPadded: 122,
  /** The same, with the tight padding. */
  compactTight: 106,
};

/**
 * Under this width a `full` row folds its dimmer under the title, full
 * width, rather than squeezing the title to a few letters. A look choice,
 * not a fit edge: the row still fits a little narrower, with less of its
 * name.
 */
const FOLD_W = 420;

const full = ['full'] as const;
const compact = ['compact'] as const;

const steps: LayoutStep[] = [
  { name: 'full padding, dimmer beside', variants: full, box: { width: 500, height: stepAt(NEEDS.padded) }, guards: 'height' },
  { name: 'tight padding, dimmer beside', variants: full, box: { width: 500, height: stepAt(NEEDS.dimmer) }, guards: 'height' },
  { name: 'dimmer folded under', variants: full, box: { width: FOLD_W - 100, height: stepAt(NEEDS.folded) }, guards: 'height' },
  { name: 'no dimmer, state line', variants: full, box: { width: 300, height: stepAt(NEEDS.stated) }, guards: 'height' },
  { name: 'full padding', variants: compact, box: { width: 200, height: stepAt(NEEDS.compactPadded) }, guards: 'height' },
  { name: 'tight padding', variants: compact, box: { width: 200, height: stepAt(NEEDS.compactTight) }, guards: 'height' },
];

const FULL = ".ohm-widget[data-kind='toggle'][data-variant='full'] > *";
const COMPACT = ".ohm-widget[data-kind='toggle'][data-variant='compact'] > *";

export default defineWidget({
  schema: toggleSchema,
  Component: ToggleWidget,
  smallest: { full: { width: 70, height: 55 }, compact: { width: 70, height: 89 } },
  steps,
  // `full` is a row; under `FOLD_W` of box the dimmer folds under the title,
  // full width. `compact` is a block with the icon at the top and the text
  // at the bottom, as Casa Panel's room tile lines them up.
  //
  // A short box gives up what does not fit, in this order: padding, then the
  // dimmer (the state line still says the brightness, and a long press still
  // opens Home Assistant's dialog), then the state line. Each step goes at
  // what the one above it needs plus the headroom (`NEEDS`), so a box a few
  // pixels short of the Builder's still fits.
  css: `
    .ohm-widget[data-kind='toggle'] > * { --ohm-toggle-pad: var(--space-4); }
    @container widget (height < ${stepAt(NEEDS.padded)}px) {
      ${FULL} { --ohm-toggle-pad: var(--space-2); }
    }
    @container widget (height < ${stepAt(NEEDS.compactPadded)}px) {
      ${COMPACT} { --ohm-toggle-pad: var(--space-2); }
    }
    .ohm-toggle {
      flex: 1;
      align-self: stretch;
      min-width: 0;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      grid-template-areas: 'icon text';
      align-items: center;
      align-content: center;
      gap: var(--space-2) var(--space-3);
    }
    .ohm-toggle[data-slides='true'] {
      grid-template-columns: auto minmax(0, 1fr) minmax(120px, 40%);
      grid-template-areas: 'icon text slider';
    }
    @container widget (width < ${FOLD_W}px) {
      .ohm-toggle[data-slides='true'] {
        grid-template-columns: auto minmax(0, 1fr);
        grid-template-areas: 'icon text' 'slider slider';
      }
    }
    @container widget (height < ${stepAt(NEEDS.dimmer)}px) or ((width < ${FOLD_W}px) and (height < ${stepAt(NEEDS.folded)}px)) {
      .ohm-toggle[data-slides='true'] {
        grid-template-columns: auto minmax(0, 1fr);
        grid-template-areas: 'icon text';
      }
      .ohm-toggle-slider { display: none; }
    }
    @container widget (height < ${stepAt(NEEDS.stated)}px) {
      .ohm-toggle[data-variant='full'] .ohm-toggle-state { display: none; }
    }
    @container widget (height < ${stepAt(NEEDS.compactTight)}px) {
      .ohm-toggle[data-variant='compact'] .ohm-toggle-state { display: none; }
    }
    .ohm-toggle[data-variant='compact'] {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'icon' 'text';
      align-content: space-between;
    }
    .ohm-toggle-icon { grid-area: icon; display: flex; color: var(--ink-secondary); }
    .ohm-toggle[data-tone='on'] .ohm-toggle-icon { color: var(--accent); }
    .ohm-toggle[data-tone='alert'] .ohm-toggle-icon { color: var(--alert); }
    .ohm-toggle-text { grid-area: text; display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
    .ohm-toggle-title, .ohm-toggle-state { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ohm-toggle-title {
      font-size: var(--type-tile-title-size);
      line-height: var(--type-tile-title-line);
      font-weight: var(--type-tile-title-weight);
      letter-spacing: var(--type-tile-title-tracking);
      color: var(--ink);
    }
    .ohm-toggle-state { font-size: var(--type-meta-size); line-height: var(--type-meta-line); color: var(--ink-muted); }
    .ohm-toggle[data-tone='on'] .ohm-toggle-state { color: var(--lit-ink); }
    .ohm-toggle[data-tone='alert'] .ohm-toggle-state { color: var(--alert); font-weight: 600; }
    .ohm-toggle-slider { grid-area: slider; min-width: 0; }
  `,
});
