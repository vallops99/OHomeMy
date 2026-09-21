/**
 * The alarm, as a glance plus a one-touch arm/disarm (#8).
 *
 * The alarm is a Singleton (CONTEXT.md): it belongs to no Area and is placed
 * on a screen by its `security` Label. A press toggles between armed-away and
 * disarmed, which is the arriving/leaving gesture the entrance panel is for;
 * the other modes live in the entity modal on long press.
 *
 * No PIN: the decision recorded on #8 is that the panel is inside the house,
 * past the gate, and a PIN on the wall panel protects nothing an intruder
 * standing at it has not already defeated.
 */
import { useActions, type Entity } from '../ha';
import { Icon } from './Icon';
import { stateLabel } from './stateLabel';
import { Tile } from './Tile';
import { onSurfaceFor, t } from './theme';

export type AlarmTileProps = {
  entity: Entity;
  colSpan?: number;
  rowSpan?: number;
};

/** Every state Home Assistant reports as "this alarm is watching". */
const ARMED = new Set(['armed_home', 'armed_away', 'armed_night', 'armed_vacation', 'armed_custom_bypass']);

export function AlarmTile({ entity, colSpan, rowSpan }: AlarmTileProps) {
  const actions = useActions();
  const armed = ARMED.has(entity.state);
  const triggered = entity.state === 'triggered';
  const unavailable = entity.unavailable;

  // A triggered alarm is the loudest thing the panel can say, so it borrows
  // the fault treatment rather than the accent: it must not read as a
  // normal "on" state.
  const fg = triggered ? t.color.fault : onSurfaceFor({ active: armed, unavailable, strong: true });

  return (
    <Tile
      entity={entity}
      active={armed}
      strong
      alwaysFilled={!triggered}
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={triggered ? { background: t.color.faultSurface, borderColor: t.color.fault } : undefined}
      onClick={() => actions.call('alarm_control_panel', armed ? 'alarm_disarm' : 'alarm_arm_away', entity.id)}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: t.space.xs,
          color: fg,
        }}
      >
        <Icon
          name={unavailable ? 'mdi:alert-circle' : triggered ? 'mdi:bell-ring' : armed ? 'mdi:shield-lock' : 'mdi:shield-off-outline'}
          size={40}
        />
        <span style={{ fontSize: t.font.glanceM, fontWeight: 600, textAlign: 'center' }}>{entity.name}</span>
        <span style={{ fontSize: t.font.body, opacity: 0.9 }}>{stateLabel(entity)}</span>
      </div>
    </Tile>
  );
}
