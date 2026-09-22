/**
 * The camera glance (#8): "has anything moved outside?", not a video wall.
 *
 * Deliberately NOT a stream. The map records camera streaming as unspecified
 * -- bandwidth, latency and hls.js behaviour on a wall panel are all unknown,
 * and the fakes are still images, so streaming UX cannot be judged yet. What
 * *can* be answered now is the question someone actually has while arriving,
 * and that is answered by the cameras' motion sensors rather than by pixels.
 *
 * Motion is Derived: any `motion` binary_sensor in the same Area as a camera
 * counts. No entity id is named, so a fourth camera appears here on its own.
 */
import type { Area, Entity } from '../ha';
import { Icon } from './Icon';
import { Tile } from './Tile';
import { onSurfaceFor, t } from './theme';

export type CameraGlanceProps = {
  /** The cameras placed here, found by their `vision` Label. */
  cameras: Entity[];
  /** Every Area, to find the motion sensors sitting alongside them. */
  areas: Area[];
};

/** Motion sensors in the Areas the cameras watch, currently detecting. */
function movingAreas(cameras: Entity[], areas: Area[]): string[] {
  const watched = new Set(cameras.map(c => c.areaId).filter(Boolean));
  const out: string[] = [];
  for (const area of areas) {
    if (!watched.has(area.id)) continue;
    const moving = area.entities.some(e => e.domain === 'binary_sensor' && e.attributes.device_class === 'motion' && e.state === 'on');
    if (moving) out.push(area.name);
  }
  return out;
}

export function CameraGlance({ cameras, areas }: CameraGlanceProps) {
  const moving = movingAreas(cameras, areas);
  const faulted = cameras.filter(c => c.unavailable);
  const active = moving.length > 0;

  // The tile opens the modal of the first camera, which is where @hakit's own
  // camera surface lives -- the nearest thing to a live view until the
  // streaming question is settled.
  const primary = cameras[0] ?? null;
  const fg = faulted.length > 0 ? t.color.fault : onSurfaceFor({ active, strong: true });

  return (
    <Tile
      entity={primary}
      active={active}
      strong
      alwaysFilled={active}
      // Intrinsic height: the sidebar's spare room belongs to the flexible
      // gap below (see ScreenView), not to this tile. Left as a default flex
      // child it stretched and pushed the gates off-screen.
      //
      // `minHeight: 'auto'` rather than the tile's usual touch-target floor:
      // this is a glance, not a control, and at 64 px the second line's
      // descenders were clipped -- "Nessun movimento" lost the tail of its
      // g. The tile is as tall as its two lines need.
      style={{ flex: '0 0 auto', minHeight: 'auto', paddingInline: t.space.lg }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: t.space.xs, color: fg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: t.space.sm }}>
          <Icon name={faulted.length > 0 ? 'mdi:cctv-off' : active ? 'mdi:motion-sensor' : 'mdi:cctv'} size={32} />
          <span style={{ fontSize: t.font.glanceM, fontWeight: 600 }}>
            {cameras.length} {cameras.length === 1 ? 'camera' : 'camere'}
          </span>
        </div>
        <span style={{ fontSize: t.font.body, opacity: 0.85 }}>
          {faulted.length > 0 ? `${faulted.length} non disponibile` : active ? `Movimento: ${moving.join(', ')}` : 'Nessun movimento'}
        </span>
      </div>
    </Tile>
  );
}
