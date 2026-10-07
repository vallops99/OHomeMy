/**
 * A `sensor`'s current value (#33): a row in `left` or `right`, a
 * `ReadingBlock` in `footer`. Name, value, unit, and an icon by device class.
 * No graph: history is out of scope (#31).
 *
 * Read-only, so not a `Tile`: a tap does nothing, and a ripple would claim
 * otherwise. The row takes the Row's shape (`rowShape.ts`) so a reading
 * beside an Area's Row reads as the same kind of thing.
 */
import type { CSSProperties } from 'react';
import type { Entity } from '../ha';
import { Icon } from './Icon';
import { ReadingBlock } from './ReadingBlock';
import { rowStyle } from './rowShape';
import { sensorIcon, sensorReading } from './sensorValue';
import { v } from './vars';

export type SensorTileProps = {
  entity: Entity;
  /** Overrides on the root box: a Widget sizes it to its own (`src/widgets`). */
  style?: CSSProperties;
};

export function SensorTile({ entity, style }: SensorTileProps) {
  const { value, unit } = sensorReading(entity);
  const unavailable = entity.unavailable;
  return (
    <div
      style={{
        ...rowStyle({ active: false, unavailable }),
        // The row's box and surface, and the rest of what `Tile` would give
        // it: a border, a padding, and the same cap on its height.
        maxHeight: v.layout.tileMaxH,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${v.space.md}`,
        boxSizing: 'border-box',
        border: `1px solid ${unavailable ? v.color.alertLine : v.color.line}`,
        ...style,
      }}
    >
      <span style={{ width: 34, display: 'flex', justifyContent: 'center', color: unavailable ? v.color.alert : v.color.inkMuted }}>
        <Icon name={unavailable ? 'mdi:alert-circle' : sensorIcon(entity)} size={26} />
      </span>
      <span
        dir='auto'
        title={entity.name}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: v.font.glanceM,
          fontWeight: 600,
          color: v.color.ink,
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
          fontSize: unavailable ? v.font.body : v.font.glanceM,
          fontWeight: unavailable ? 700 : 400,
          color: unavailable ? v.color.alert : v.color.ink,
        }}
      >
        {unavailable ? value.toUpperCase() : value}
        {unit && (
          <span style={{ fontSize: v.font.body, color: v.color.inkMuted }}>
            {' '}
            <bdi>{unit}</bdi>
          </span>
        )}
      </span>
    </div>
  );
}

/** A `sensor` in `footer`: its value over its name. */
export function SensorBlock({ entity, style }: SensorTileProps) {
  const { value, unit } = sensorReading(entity);
  return (
    <ReadingBlock
      icon={sensorIcon(entity)}
      value={value}
      detail={unit === null ? undefined : <bdi>{unit}</bdi>}
      name={entity.name}
      unavailable={entity.unavailable}
      style={style}
    />
  );
}
