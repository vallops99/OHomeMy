/**
 * The alarm in full (#34): what an `alarm_control_panel` is in `left` or
 * `right`. Its state, and every arm mode it supports -- or, when it is not
 * disarmed, the disarm -- as the same buttons the chip's Modal offers
 * (`AlarmCommands`, #30), not a second implementation. In `footer` it stays
 * `AlarmTile`, the one-touch away/disarm; in `glance` it stays the chip.
 *
 * Not a `Tile`: the card is not a control, its buttons are. No PIN (#8).
 */
import type { Entity } from '../ha';
import { AlarmCommands } from './AlarmCommands';
import { alarmIcon, isArmed, isTriggered } from './alarmState';
import { Icon } from './Icon';
import { stateLabel } from './stateLabel';
import { t } from './theme';

export type AlarmPanelProps = { entity: Entity };

export function AlarmPanel({ entity }: AlarmPanelProps) {
  const unavailable = entity.unavailable;
  // A triggered alarm borrows the fault treatment, as `AlarmTile` does: it
  // must not read as a normal "on".
  const alarming = unavailable || isTriggered(entity);
  const stateColor = alarming ? t.color.fault : isArmed(entity) ? t.color.activeStrong : t.color.textSecondary;

  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.sm,
        padding: t.space.md,
        boxSizing: 'border-box',
        borderRadius: t.radius.tile,
        border: `1px solid ${alarming ? t.color.fault : t.color.border}`,
        background: alarming ? t.color.faultSurface : t.color.surface,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: t.space.sm, minWidth: 0 }}>
        <span style={{ display: 'flex', color: stateColor }}>
          <Icon name={alarmIcon(entity)} size={26} />
        </span>
        <span
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
        <span style={{ flexShrink: 0, fontSize: t.font.body, fontWeight: 700, color: stateColor }}>
          {unavailable ? stateLabel(entity).toUpperCase() : stateLabel(entity)}
        </span>
      </div>
      {!unavailable && <AlarmCommands alarm={entity} row />}
    </div>
  );
}
