/**
 * A `binary_sensor` (#34): a read-only row in `left` or `right`, a
 * `ReadingBlock` in `footer`. Worded by device class (`binarySensorView`): a
 * contact reads `Aperta`/`Chiusa`, and an open one is drawn as the Verdict
 * draws an open way in -- its icon, and the state in full weight.
 *
 * Not a `Tile`, like `SensorTile`: nothing happens on a tap.
 */
import type { CSSProperties } from 'react';
import type { Entity } from '../ha';
import { binarySensorView } from './binarySensorState';
import { Icon } from './Icon';
import { ReadingBlock } from './ReadingBlock';
import { rowStyle } from './rowShape';
import { v } from './vars';

export type BinarySensorTileProps = {
  entity: Entity;
  /** Overrides on the root box: a Widget sizes it to its own (`src/widgets`). */
  style?: CSSProperties;
};

export function BinarySensorTile({ entity, style }: BinarySensorTileProps) {
  const { label, icon, open } = binarySensorView(entity);
  const unavailable = entity.unavailable;
  return (
    <div
      style={{
        ...rowStyle({ active: false, unavailable }),
        maxHeight: v.layout.tileMaxH,
        display: 'flex',
        alignItems: 'center',
        padding: `0 ${v.space.md}`,
        boxSizing: 'border-box',
        border: `1px solid ${unavailable ? v.color.alertLine : v.color.line}`,
        ...style,
      }}
    >
      <span
        style={{
          width: 34,
          display: 'flex',
          justifyContent: 'center',
          color: unavailable ? v.color.alert : open ? v.color.ink : v.color.inkMuted,
        }}
      >
        <Icon name={icon} size={26} />
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
          fontSize: v.font.body,
          fontWeight: unavailable || open ? 700 : 400,
          color: unavailable ? v.color.alert : open ? v.color.ink : v.color.inkMuted,
        }}
      >
        {unavailable ? label.toUpperCase() : label}
      </span>
    </div>
  );
}

/** A `binary_sensor` in `footer`: its state over its name. */
export function BinarySensorBlock({ entity, style }: BinarySensorTileProps) {
  const { label, icon } = binarySensorView(entity);
  return <ReadingBlock icon={icon} value={label} name={entity.name} unavailable={entity.unavailable} style={style} />;
}
