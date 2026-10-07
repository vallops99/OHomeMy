/**
 * A `vacuum` (#36): what it is in `left` or `right`. Its state in words,
 * its battery, and start or pause and back to the dock at the touch floor --
 * each only when `supported_features` allows it and the state makes sense
 * (`vacuumControls`).
 *
 * The battery is Derived from the vacuum's own device (`useDeviceBattery`):
 * a vacuum no longer carries it as an attribute. With no device, or no
 * battery sensor on it, no battery shows. Not a `Tile`: the card is not a
 * control, its buttons are. Unavailable is a Fault, with nothing to press.
 */
import type { CSSProperties } from 'react';
import { useActions, useDeviceBattery, type Entity } from '../ha';
import { fmt, tr } from '../i18n';
import { entityIcon, Icon } from './Icon';
import { stateLabel } from './stateLabel';
import { v } from './vars';
import { vacuumControls } from './vacuumState';

export type VacuumCardProps = {
  entity: Entity;
  /** Overrides on the root box: a Widget sizes it to its own (`src/widgets`). */
  style?: CSSProperties;
};

/** Home Assistant's battery glyph for a level, in tens. */
const batteryIcon = (level: number) =>
  level >= 95 ? 'mdi:battery' : level < 5 ? 'mdi:battery-outline' : `mdi:battery-${Math.round(level / 10) * 10}`;

export function VacuumCard({ entity, style }: VacuumCardProps) {
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
        gap: v.space.md,
        padding: v.space.md,
        boxSizing: 'border-box',
        borderRadius: v.radius.tile,
        border: `1px solid ${unavailable ? v.color.alertLine : v.color.line}`,
        background: unavailable ? v.color.alertSurface : v.color.surface,
        ...style,
      }}
    >
      <span style={{ display: 'flex', color: unavailable ? v.color.alert : cleaning ? v.color.accent : v.color.inkMuted }}>
        <Icon name={unavailable ? 'mdi:alert-circle' : entityIcon(entity)} size={32} />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span
          dir='auto'
          style={{
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
            display: 'flex',
            alignItems: 'center',
            gap: v.space.sm,
            fontSize: v.font.body,
            color: unavailable ? v.color.alert : v.color.inkMuted,
          }}
        >
          <span style={{ fontWeight: unavailable || cleaning ? 700 : 400, color: cleaning ? v.color.accent : undefined }}>
            {unavailable ? stateLabel(entity).toUpperCase() : stateLabel(entity)}
          </span>
          {battery !== null && !unavailable && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Icon name={batteryIcon(battery)} size={20} />
              {fmt.percent(Math.round(battery))}
            </span>
          )}
        </span>
      </div>
      {controls.startPause && (
        <VacuumButton
          icon={controls.startPause === 'pause' ? 'mdi:pause' : 'mdi:play'}
          label={controls.startPause === 'pause' ? tr('vacuum.pause') : tr('vacuum.start')}
          onPress={() => vacuum(controls.startPause === 'pause' ? 'pause' : 'start')}
        />
      )}
      {controls.dock && <VacuumButton icon='mdi:home-import-outline' label={tr('vacuum.dock')} onPress={() => vacuum('return_to_base')} />}
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
        minHeight: v.touch.floor,
        display: 'flex',
        alignItems: 'center',
        gap: v.space.xs,
        padding: `0 ${v.space.sm}`,
        borderRadius: v.radius.sm,
        border: `1px solid ${v.color.line}`,
        background: v.color.surfaceWell,
        color: v.color.ink,
        fontSize: v.font.caption,
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
