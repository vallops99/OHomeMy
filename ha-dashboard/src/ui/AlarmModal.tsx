/**
 * @hakit's entity Modal for the alarm, opened by a tap on the alarm chip
 * (#30) -- where arming and disarming happen.
 *
 * `Tile` gets this Modal for free from `CardBase`, on long press. The chip
 * is not a card, so it mounts the Modal itself: the one other place @hakit's
 * Modal is touched.
 *
 * No PIN, as with `AlarmTile` (decision on #8): the panel is inside the
 * house, past the gate. @hakit's own alarm controls cannot honour that --
 * every arm and disarm button stays disabled until *some* code is typed,
 * keypad or no keypad, and its `defaultCode` escape would send a made-up
 * code to the integration. So the Modal keeps its header, state and logbook,
 * and its controls are ours: one button per `alarmCommands` entry, calling
 * the service with no code, as the tile's press does.
 */
import { ModalByEntityDomain } from '@hakit/components';
import { useActions, type Entity } from '../ha';
import { alarmCommands } from './alarmState';
import { Icon } from './Icon';
import { stateLabel } from './stateLabel';
import { t } from './theme';

export type AlarmModalProps = {
  /** The `alarm_control_panel` entity. */
  alarm: Entity;
  open: boolean;
  onClose: () => void;
};

export function AlarmModal({ alarm, open, onClose }: AlarmModalProps) {
  const actions = useActions();
  return (
    <ModalByEntityDomain
      // Our ids are plain strings by design (src/ha/types.ts); @hakit wants
      // its own branded name. `unknown` is the widest one it accepts.
      entity={alarm.id as 'unknown'}
      open={open}
      onClose={onClose}
      title={alarm.name}
      // As `Tile` does: the Modal's headline says what the chip says.
      stateTitle={stateLabel(alarm)}
      hideDefaultLayout
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: t.space.sm, padding: t.space.md }}>
        {alarmCommands(alarm).map(command => (
          <button
            key={command.service}
            type='button'
            onClick={() => actions.call('alarm_control_panel', command.service, alarm.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: t.space.xs,
              minWidth: t.touch.primary * 2,
              minHeight: t.touch.primary * 1.5,
              padding: t.space.md,
              borderRadius: t.radius.tile,
              border: `1px solid ${t.color.border}`,
              background: t.color.surfaceRaised,
              color: t.color.textPrimary,
              fontSize: t.font.body,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Icon name={command.icon} size={32} />
            {command.label}
          </button>
        ))}
      </div>
    </ModalByEntityDomain>
  );
}
