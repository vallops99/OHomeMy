/**
 * Drives @hakit's theme from our design tokens.
 *
 * ADR-0002 confined @hakit to `src/ha` and `src/ui` and took `CardBase`'s
 * behaviour via `onlyFunctionality`, so our tokens own every pixel *we*
 * render. But @hakit also renders surfaces we never author: the long-press
 * entity modal, which it mounts into `<body>` itself. Those read @hakit's own
 * CSS variables, so with a bare `<ThemeProvider />` the modal came up in its
 * stock navy-and-orange over our dark-neutral green panel (#7 verified that
 * the modal *opens*, never what it looked like -- the gap this closes).
 *
 * @hakit derives its entire ~700-variable palette from a few roots, so
 * overriding those roots retints everything downstream rather than fighting
 * each component. Anything the roots cannot reach is corrected in
 * `globalStyles` below, keyed to @hakit's own class names.
 */
import { ThemeProvider } from '@hakit/components';
import { KNOBS } from '../theme/tokens';
import { t } from './theme';

/**
 * @hakit builds its surfaces from `--ha-h/--ha-s/--ha-l` and its accent from
 * the `A*` scale. Feeding it our ground hue and accent makes its own
 * components land in our palette without us restyling them one by one.
 */
const roots = `
  --ha-h: ${KNOBS.groundHue};
  --ha-s: ${KNOBS.groundSat};
  --ha-l: 9;
  --ha-A400-h: ${KNOBS.accentHue};
  --ha-A400-s: ${KNOBS.accentSat}%;
  --ha-A400-l: ${Math.max(KNOBS.accentLight + 18, 42)}%;
  --ha-A700-h: ${KNOBS.accentHue};
  --ha-A700-s: ${KNOBS.accentSat}%;
  --ha-A700-l: ${KNOBS.accentLight}%;
`;

export function HakitTheme() {
  return (
    <ThemeProvider
      theme={{
        // @hakit ships Roboto; ADR-0001's scale is set in the system stack.
        font: { family: t.font.family, size: `${t.font.body}px` },
      }}
      globalStyles={`
        :root, html, body {
          ${roots}
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
          border: 1px solid ${t.color.border};
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
          background-color: ${t.color.activeStrong} !important;
        }
      `}
    />
  );
}
