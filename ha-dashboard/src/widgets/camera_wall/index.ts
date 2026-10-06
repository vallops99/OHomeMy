import { defineWidget } from '../types';
import { CameraWallWidget } from './CameraWallWidget';
import { cameraWallSchema } from './schema';

export default defineWidget({
  schema: cameraWallSchema,
  Component: CameraWallWidget,
  // A wide box puts the strip beside the big Feed, one 16:9 thumbnail a row
  // from the top, while the big Feed spans the whole height. A box under
  // 600 px puts the strip under it, two thumbnails a line, since a strip
  // beside it would leave the big one a sliver. With one camera there is no
  // strip. Cells are placed by `--ohm-cw-strip` (their place in the strip)
  // and `--ohm-cw-thumbs` (how many there are), so the DOM order never changes (the component's
  // header says why).
  //
  // The big Feed shows the whole picture; a thumbnail fills its box and
  // crops.
  css: `
    .ohm-camera_wall {
      display: grid;
      grid-template-columns: minmax(0, 1fr) clamp(160px, 26%, 300px);
      grid-template-rows: repeat(var(--ohm-cw-thumbs), auto) minmax(0, 1fr);
      gap: var(--space-3) var(--space-5);
      min-height: 0;
    }
    .ohm-camera_wall[data-single='true'] { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); }
    .ohm-camera_wall-cell { min-width: 0; min-height: 0; display: flex; flex-direction: column; grid-column: 2; grid-row: var(--ohm-cw-strip); }
    .ohm-camera_wall-cell[data-big='true'] { grid-column: 1; grid-row: 1 / -1; }
    .ohm-camera_wall-cell[role='button'] { cursor: pointer; }
    @container widget (max-width: 599px) {
      .ohm-camera_wall:not([data-single='true']) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: minmax(0, 1fr);
        grid-auto-rows: auto;
        gap: var(--space-3) var(--space-2);
      }
      .ohm-camera_wall-cell { grid-column: auto; grid-row: auto; }
      .ohm-camera_wall-cell[data-big='true'] { grid-column: 1 / -1; grid-row: 1; }
    }

    .ohm-camera_wall-frame {
      position: relative;
      overflow: hidden;
      aspect-ratio: 16 / 9;
      border-radius: var(--radius-tile);
      border: 1px solid var(--line);
      background: var(--surface-well);
    }
    .ohm-camera_wall-cell[data-big='true'] .ohm-camera_wall-frame { aspect-ratio: auto; flex: 1; min-height: 0; }
    .ohm-camera_wall-frame[data-phase='unavailable'] { border-color: var(--alert-line); background: var(--alert-surface); }
    .ohm-camera_wall-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      opacity: 0;
    }
    .ohm-camera_wall-cell[data-big='true'] .ohm-camera_wall-video { object-fit: contain; }
    .ohm-camera_wall-video[data-live='true'] { opacity: 1; }

    .ohm-camera_wall-state {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-4);
      text-align: center;
      font-size: var(--type-body-size);
      line-height: var(--type-body-line);
      background: var(--surface);
      color: var(--ink-secondary);
    }
    .ohm-camera_wall-state[data-phase='unavailable'] { background: var(--alert-surface); color: var(--alert); }
    .ohm-camera_wall-state-icon { display: flex; }
    .ohm-camera_wall-state[data-phase='connecting'] .ohm-camera_wall-state-icon { animation: ohm-camera_wall-pulse 1.4s ease-in-out infinite; }
    @keyframes ohm-camera_wall-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
    .ohm-camera_wall-state-fault { font-weight: 600; }
    .ohm-camera_wall-retry {
      min-height: var(--target-min);
      padding: 0 var(--space-5);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      border-radius: var(--radius-pill);
      border: 1px solid var(--line-strong);
      background: var(--surface-control);
      color: var(--ink);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    .ohm-camera_wall-caption {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      column-gap: var(--space-2);
      padding: var(--space-1) var(--space-1) 0;
      font-size: var(--type-meta-size);
      line-height: var(--type-meta-line);
      font-weight: 500;
    }
    .ohm-camera_wall-cell[data-big='true'] .ohm-camera_wall-caption { flex-wrap: nowrap; font-size: var(--type-body-lg-size); line-height: var(--type-body-lg-line); }
    .ohm-camera_wall-name { min-width: 0; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ohm-camera_wall-caption[data-phase='unavailable'] .ohm-camera_wall-name { color: var(--alert); }
    .ohm-camera_wall-status { flex-shrink: 0; color: var(--ink-secondary); }
    .ohm-camera_wall-status[data-tone='motion'] { color: var(--accent); }
    .ohm-camera_wall-status[data-tone='fault'] { color: var(--alert); }
  `,
});
