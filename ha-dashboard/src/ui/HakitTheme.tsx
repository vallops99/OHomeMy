/**
 * Drives @hakit's theme from our design tokens.
 *
 * ADR-0002 confined @hakit to `src/ha` and `src/ui` and took `CardBase`'s
 * behaviour via `onlyFunctionality`, so our tokens own every pixel *we*
 * render. But @hakit also renders surfaces we never author: the long-press
 * entity modal, which it mounts into `<body>` itself. Those read @hakit's own
 * CSS variables, so with a bare `<ThemeProvider />` the modal came up in its
 * stock navy-and-orange over our own dark panel (#7 verified that
 * the modal *opens*, never what it looked like -- the gap this closes).
 *
 * @hakit derives its entire ~700-variable palette from a few roots, so
 * overriding those roots retints everything downstream rather than fighting
 * each component. Anything the roots cannot reach is corrected in
 * `globalStyles` below, keyed to @hakit's own class names.
 */
import { ThemeProvider } from '@hakit/components';
import { hexToHsl } from '../theme/color';
import { cssVariables } from '../theme/tokens';
import { isPhone } from './device';
import { t } from './theme';
import { boxScaleVariables } from './vars';

const ground = hexToHsl(t.color.surface);
const accent = hexToHsl(t.color.accent);

/**
 * @hakit builds its surfaces from `--ha-h/--ha-s/--ha-l` and its accent from
 * the `A*` scale. Feeding it Casa Panel's card surface and accent makes its
 * own components land in our palette without us restyling them one by one.
 */
const roots = `
  --ha-h: ${ground.h};
  --ha-s: ${ground.s};
  --ha-l: ${ground.l};
  --ha-A400-h: ${accent.h};
  --ha-A400-s: ${accent.s}%;
  --ha-A400-l: ${accent.l}%;
  --ha-A700-h: ${accent.h};
  --ha-A700-s: ${accent.s}%;
  --ha-A700-l: ${accent.l}%;
`;

/**
 * `MediaCard` folds in two on a phone. A Widget's box decides that for
 * itself (`widgets/media`); the label-driven Dashboard has only the device.
 */
const PHONE_MEDIA_CARD = `
  --ohm-media-wrap: wrap;
  --ohm-media-text-flex: 1 1 calc(100% - 64px - ${t.space.md}px);
  --ohm-media-volume-flex: 1;
`;

export function HakitTheme() {
  return (
    <ThemeProvider
      theme={{
        // @hakit ships Roboto; Casa Panel is set in Geist.
        font: { family: t.font.family, size: `${t.font.body}px` },
      }}
      globalStyles={`
        :root, html, body {
          ${roots}
        }

        /* Casa Panel's tokens under its own names (ADR-0013), for any
           stylesheet written against them, and the page shell it asks for.
           Then the box scale (vars.ts) at the page's root, by device: what
           the label-driven Dashboard and an overlay over the whole screen
           are sized by, since there the screen is the box. A Widget's own
           box sets its own (#62). */
        :root {
          ${cssVariables()}
          ${boxScaleVariables(t)}
          ${isPhone ? PHONE_MEDIA_CARD : ''}
        }
        body {
          margin: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: var(--font-sans);
          -webkit-font-smoothing: antialiased;
        }

        /* The modal is @hakit's own surface, mounted outside our tree. Bring
           it onto our ground and radius rather than leaving it stock. */
        .modal-backdrop {
          background-color: ${t.color.backdrop} !important;
          backdrop-filter: blur(3px);
        }
        .modal-container, .modal-inner {
          background-color: ${t.color.surface} !important;
          color: ${t.color.textPrimary} !important;
          border: 1px solid ${t.color.line};
          border-radius: ${t.radius.tile}px !important;
        }
        .modal-header, .modal-header * {
          color: ${t.color.textPrimary} !important;
        }

        /* A light entity's controls are tinted from its own reported colour,
           which is why brightness came up orange. Our accent instead: on a
           wall panel every control should read from the same palette. */
        .modal-container .slider-track-background,
        .modal-container .slider-track-bar {
          background-color: ${t.color.accent} !important;
        }
      `}
    />
  );
}
