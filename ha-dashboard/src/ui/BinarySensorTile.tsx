/**
 * A `binary_sensor` (#34): a read-only row in `left` or `right`, a
 * `ReadingBlock` in `footer`. Worded by device class (`binarySensorView`): a
 * contact reads `Aperta`/`Chiusa`, and an open one is drawn as the Verdict
 * draws an open way in -- its icon, and the state in full weight.
 *
 * Not a `Tile`, like `SensorTile`: nothing happens on a tap.
 */
import type { Entity } from '../ha';
import { binarySensorView } from './binarySensorState';
import { Icon } from './Icon';
import { ReadingBlock } from './ReadingBlock';
import { rowStyle } from './rowShape';
import { t } from './theme';

export type BinarySensorTileProps = { entity: Entity };

export function BinarySensorTile({ entity }: BinarySensorTileProps) {
  const { label, icon, open } = binarySensorView(entity);
  const unavailable = entity.unavailable;
  return (
    <div
      style={{
        ...rowStyle({ active: false, unavailable }),
        maxHeight: t.layout.tileMaxH,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${t.space.md}px`,
        boxSizing: 'border-box',
        border: `1px solid ${unavailable ? t.color.faultLine : t.color.border}`,
      }}
    >
      <span
        style={{
          width: 34,
          display: 'flex',
          justifyContent: 'center',
          color: unavailable ? t.color.fault : open ? t.color.textPrimary : t.color.textSecondary,
        }}
      >
        <Icon name={icon} size={26} />
      </span>
      <span
        title={entity.name}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: t.font.glanceM,
          fontWeight: 600,
          color: t.color.textPrimary,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {entity.name}
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: t.font.body,
          fontWeight: unavailable || open ? 700 : 400,
          color: unavailable ? t.color.fault : open ? t.color.textPrimary : t.color.textSecondary,
        }}
      >
        {unavailable ? label.toUpperCase() : label}
      </span>
    </div>
  );
}

/** A `binary_sensor` in `footer`: its state over its name. */
export function BinarySensorBlock({ entity }: BinarySensorTileProps) {
  const { label, icon } = binarySensorView(entity);
  return <ReadingBlock icon={icon} value={label} name={entity.name} unavailable={entity.unavailable} />;
}
