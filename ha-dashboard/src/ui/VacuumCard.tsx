/**
 * A `vacuum` (#36): what it is in `left` or `right`. Its state in Italian,
 * its battery, and start or pause and back to the dock at the touch floor --
 * each only when `supported_features` allows it and the state makes sense
 * (`vacuumControls`).
 *
 * The battery is Derived from the vacuum's own device (`useDeviceBattery`):
 * a vacuum no longer carries it as an attribute. With no device, or no
 * battery sensor on it, no battery shows. Not a `Tile`: the card is not a
 * control, its buttons are. Unavailable is a Fault, with nothing to press.
 */
import { useActions, useDeviceBattery, type Entity } from '../ha';
import { entityIcon, Icon } from './Icon';
import { stateLabel } from './stateLabel';
import { t } from './theme';
import { vacuumControls } from './vacuumState';

export type VacuumCardProps = { entity: Entity };

/** Home Assistant's battery glyph for a level, in tens. */
const batteryIcon = (level: number) =>
  level >= 95 ? 'mdi:battery' : level < 5 ? 'mdi:battery-outline' : `mdi:battery-${Math.round(level / 10) * 10}`;

export function VacuumCard({ entity }: VacuumCardProps) {
  const actions = useActions();
  const battery = useDeviceBattery(entity);
  const controls = vacuumControls(entity);
  const unavailable = entity.unavailable;
  const cleaning = entity.state === 'cleaning';
  const vacuum = (service: string) => actions.call('vacuum', service, entity.id);

  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: t.space.md,
        padding: t.space.md,
        boxSizing: 'border-box',
        borderRadius: t.radius.tile,
        border: `1px solid ${unavailable ? t.color.faultLine : t.color.border}`,
        background: unavailable ? t.color.faultSurface : t.color.surface,
      }}
    >
      <span style={{ display: 'flex', color: unavailable ? t.color.fault : cleaning ? t.color.activeStrong : t.color.textSecondary }}>
        <Icon name={unavailable ? 'mdi:alert-circle' : entityIcon(entity)} size={32} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
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
            display: 'flex',
            alignItems: 'center',
            gap: t.space.sm,
            fontSize: t.font.body,
            color: unavailable ? t.color.fault : t.color.textSecondary,
          }}
        >
          <span style={{ fontWeight: unavailable || cleaning ? 700 : 400, color: cleaning ? t.color.activeStrong : undefined }}>
            {unavailable ? stateLabel(entity).toUpperCase() : stateLabel(entity)}
          </span>
          {battery !== null && !unavailable && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Icon name={batteryIcon(battery)} size={20} />
              {Math.round(battery)}%
            </span>
          )}
        </span>
      </div>
      {controls.startPause && (
        <VacuumButton
          icon={controls.startPause === 'pause' ? 'mdi:pause' : 'mdi:play'}
          label={controls.startPause === 'pause' ? 'Pausa' : 'Avvia'}
          onPress={() => vacuum(controls.startPause === 'pause' ? 'pause' : 'start')}
        />
      )}
      {controls.dock && <VacuumButton icon='mdi:home-import-outline' label='Alla base' onPress={() => vacuum('return_to_base')} />}
    </div>
  );
}

/** A labelled button at the ADR-0001 touch floor. */
function VacuumButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <button
      type='button'
      onClick={onPress}
      style={{
        flexShrink: 0,
        minHeight: t.touch.floor,
        display: 'flex',
        alignItems: 'center',
        gap: t.space.xs,
        padding: `0 ${t.space.sm}px`,
        borderRadius: t.radius.sm,
        border: `1px solid ${t.color.border}`,
        background: t.color.surfaceRaised,
        color: t.color.textPrimary,
        fontSize: t.font.caption,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      <Icon name={icon} size={24} />
      {label}
    </button>
  );
}
