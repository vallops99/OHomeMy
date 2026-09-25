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
 * and its controls are ours (`AlarmCommands`): one button per `alarmCommands`
 * entry, calling the service with no code, as the tile's press does.
 */
import { ModalByEntityDomain } from '@hakit/components';
import type { Entity } from '../ha';
import { AlarmCommands } from './AlarmCommands';
import { stateLabel } from './stateLabel';

export type AlarmModalProps = {
  /** The `alarm_control_panel` entity. */
  alarm: Entity;
  open: boolean;
  onClose: () => void;
};

export function AlarmModal({ alarm, open, onClose }: AlarmModalProps) {
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
      <AlarmCommands alarm={alarm} />
    </ModalByEntityDomain>
  );
}
