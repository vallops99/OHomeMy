/**
 * The camera glance (#8): "has anything moved outside?", not a video wall.
 *
 * What cameras become in `glance` (#29). The live pictures are Feeds, on
 * whichever Page Places these same cameras in `left` or `right`; this tile
 * answers the question someone has while arriving, from the cameras' motion
 * sensors rather than from pixels, and is the way to those Feeds.
 *
 * Motion is Derived per camera (`cameraMoving`): the `motion` binary_sensor
 * on the camera's own device. No entity id is named, so a fourth camera
 * appears here on its own.
 *
 * Tapping opens `feedsPage`, and nothing else: no @hakit modal. With no such
 * Page the tile is not a control at all, and does not look like one -- a dead
 * control that looks live is worse than none (PlacementView.tsx).
 */
import type { Entity } from '../ha';
import { Icon } from './Icon';
import { Tile } from './Tile';
import { onSurfaceFor, t } from './theme';

export type CameraGlanceProps = {
  /** The cameras Placed in `glance`. */
  cameras: Entity[];
  /** Those of them whose device reports motion right now. */
  moving: Entity[];
  /** Opens the Page of these cameras' Feeds; absent when there is none. */
  onOpen?: () => void;
};

export function CameraGlance({ cameras, moving, onOpen }: CameraGlanceProps) {
  const faulted = cameras.filter(c => c.unavailable);
  const active = moving.length > 0;
  const fg = faulted.length > 0 ? t.color.fault : onSurfaceFor({ active, strong: true });

  const detail =
    faulted.length > 0
      ? `${faulted.length} non disponibile`
      : moving.length === 1
        ? `Movimento: ${moving[0].name}`
        : moving.length > 1
          ? `Movimento su ${moving.length} camere`
          : 'Nessun movimento';

  return (
    <Tile
      active={active}
      strong
      alwaysFilled={active}
      row
      onClick={onOpen}
      // `minHeight: 'auto'` rather than the tile's usual touch-target floor:
      // at 64 px the second line's descenders were clipped -- "Nessun
      // movimento" lost the tail of its g. The tile is as tall as its two
      // lines need, which is over the floor anyway.
      //
      // `sm` top and bottom rather than the tile's `md`: 74 px, not 86. In
      // `glance` (#29) this tile is part of the block that never yields, and
      // at 1280x768 the gates below had 4 px less than they need
      // (scripts/measure-panel.ts).
      style={{ flex: '0 0 auto', minHeight: 'auto', paddingInline: t.space.lg, paddingBlock: t.space.sm }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: t.space.xs, color: fg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: t.space.sm }}>
          <Icon name={faulted.length > 0 ? 'mdi:cctv-off' : active ? 'mdi:motion-sensor' : 'mdi:cctv'} size={32} />
          <span style={{ fontSize: t.font.glanceM, fontWeight: 600 }}>
            {cameras.length} {cameras.length === 1 ? 'camera' : 'camere'}
          </span>
        </div>
        <span style={{ fontSize: t.font.body, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {detail}
        </span>
      </div>
      {onOpen && (
        <div style={{ display: 'flex', flexShrink: 0, color: fg }}>
          <Icon name='mdi:chevron-right' size={32} />
        </div>
      )}
    </Tile>
  );
}
