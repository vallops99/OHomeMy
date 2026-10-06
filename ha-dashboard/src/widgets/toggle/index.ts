import { defineWidget } from '../types';
import { ToggleWidget } from './ToggleWidget';
import { toggleSchema } from './schema';

export default defineWidget({
  schema: toggleSchema,
  Component: ToggleWidget,
  // `full` is a row; under 420 px of box the dimmer folds under the title,
  // full width, rather than squeezing the title to a few letters. `compact`
  // is a block with the icon at the top and the text at the bottom, as
  // Casa Panel's room tile lines them up.
  //
  // A short box gives up what does not fit, in this order: padding, then the
  // dimmer (the state line still says the brightness, and a long press still
  // opens Home Assistant's dialog), then the state line. The thresholds are
  // the dimmer's 56 px and the text's 50 px plus padding and border.
  css: `
    .ohm-widget[data-kind='toggle'] > * { --ohm-toggle-pad: var(--space-4); }
    @container widget (max-height: 99px) {
      .ohm-widget[data-kind='toggle'] > * { --ohm-toggle-pad: var(--space-2); }
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
    @container widget (max-width: 419px) {
      .ohm-toggle[data-slides='true'] {
        grid-template-columns: auto minmax(0, 1fr);
        grid-template-areas: 'icon text' 'slider slider';
      }
    }
    @container widget (max-height: 73px) or ((max-width: 419px) and (max-height: 147px)) {
      .ohm-toggle[data-slides='true'] {
        grid-template-columns: auto minmax(0, 1fr);
        grid-template-areas: 'icon text';
      }
      .ohm-toggle-slider { display: none; }
    }
    @container widget (max-height: 67px) {
      .ohm-toggle-state { display: none; }
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
