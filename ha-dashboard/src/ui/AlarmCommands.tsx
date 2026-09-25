/**
 * The alarm's commands as buttons (#30): the arm modes the entity supports
 * while disarmed, a disarm in every other state, each calling its service
 * with no code (decision on #8). One implementation, in two places: the
 * alarm Modal the chip opens, and the full alarm card in `left`/`right`
 * (#34).
 */
import { useActions, type Entity } from '../ha';
import { alarmCommands } from './alarmState';
import { Icon } from './Icon';
import { t } from './theme';

export type AlarmCommandsProps = {
  alarm: Entity;
  /** Lay the buttons in one row that shares the width, for a card rather than a Modal. */
  row?: boolean;
};

export function AlarmCommands({ alarm, row = false }: AlarmCommandsProps) {
  const actions = useActions();
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: row ? 'nowrap' : 'wrap',
        justifyContent: 'center',
        gap: t.space.sm,
        padding: row ? 0 : t.space.md,
      }}
    >
      {alarmCommands(alarm).map(command => (
        <button
          key={command.service}
          type='button'
          onClick={() => actions.call('alarm_control_panel', command.service, alarm.id)}
          style={{
            display: 'flex',
            // In a row: the icon beside a short label, one line at the touch
            // floor. In the Modal: icon over the full label, as #30 drew it.
            flexDirection: row ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.space.xs,
            ...(row
              ? { flex: 1, minWidth: 0, minHeight: t.touch.floor, whiteSpace: 'nowrap' }
              : { minWidth: t.touch.primary * 2, minHeight: t.touch.primary * 1.5 }),
            padding: row ? `0 ${t.space.xs}px` : t.space.md,
            borderRadius: row ? t.radius.sm : t.radius.tile,
            border: `1px solid ${t.color.border}`,
            background: t.color.surfaceRaised,
            color: t.color.textPrimary,
            // `caption` in a row: three buttons share about 125 px each in a
            // 420 px column, and "Fuori casa" at `body` squeezed its own icon
            // (measured, #34). A fourth mode ellipsises rather than overflows.
            fontSize: row ? t.font.caption : t.font.body,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', flexShrink: 0 }}>
            <Icon name={command.icon} size={row ? 22 : 32} />
          </span>
          {row ? <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{command.short}</span> : command.label}
        </button>
      ))}
    </div>
  );
}
