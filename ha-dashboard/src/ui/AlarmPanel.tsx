/**
 * The alarm in full (#34): what an `alarm_control_panel` is in `left` or
 * `right`. Its state, and every arm mode it supports -- or, when it is not
 * disarmed, the disarm -- as the same buttons the chip's Modal offers
 * (`AlarmCommands`, #30), not a second implementation. In `footer` it stays
 * `AlarmTile`, the one-touch away/disarm; in `glance` it stays the chip.
 *
 * Not a `Tile`: the card is not a control, its buttons are. No PIN (#8).
 */
import type { CSSProperties } from 'react';
import type { Entity } from '../ha';
import { AlarmCommands } from './AlarmCommands';
import { alarmIcon, isArmed, isTriggered } from './alarmState';
import { Icon } from './Icon';
import { stateLabel } from './stateLabel';
import { v } from './vars';

export type AlarmPanelProps = {
  entity: Entity;
  /** Overrides on the root box: a Widget sizes it to its own (`src/widgets`). */
  style?: CSSProperties;
};

export function AlarmPanel({ entity, style }: AlarmPanelProps) {
  const unavailable = entity.unavailable;
  // A triggered alarm borrows the fault treatment, as `AlarmTile` does: it
  // must not read as a normal "on".
  const alarming = unavailable || isTriggered(entity);
  const stateColor = alarming ? v.color.alert : isArmed(entity) ? v.color.accent : v.color.inkMuted;

  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: v.space.sm,
        padding: v.space.md,
        boxSizing: 'border-box',
        borderRadius: v.radius.tile,
        border: `1px solid ${alarming ? v.color.alertLine : v.color.line}`,
        background: alarming ? v.color.alertSurface : v.color.surface,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: v.space.sm, minWidth: 0 }}>
        <span style={{ display: 'flex', color: stateColor }}>
          <Icon name={alarmIcon(entity)} size={26} />
        </span>
        <span
          dir='auto'
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
        <span style={{ flexShrink: 0, fontSize: v.font.body, fontWeight: 700, color: stateColor }}>
          {unavailable ? stateLabel(entity).toUpperCase() : stateLabel(entity)}
        </span>
      </div>
      {!unavailable && <AlarmCommands alarm={entity} row />}
    </div>
  );
}
