/**
 * A `climate` entity in full (#33): what it is in `left` or `right`. The room
 * temperature and its humidity, the setpoint with − and +, the HVAC modes the
 * entity reports, and what it is doing right now. The humidity is the
 * thermostat's own, or the sensor on its device (`climateHumidity`); with
 * neither, the line is not there. Its compact form, for `footer`, is
 * `ClimateBlock` below.
 *
 * Our own, not @hakit's `ClimateCard`: that card draws its own dial and
 * surfaces, and ADR-0002 keeps every pixel ours. Only the service calls are
 * Home Assistant's, through `useActions`.
 *
 * The card as a whole is not a control -- only its buttons are -- so it is a
 * plain surface, not a `Tile`: a ripple across the whole card on a tap
 * between buttons would be a dead control that looks live. An Unavailable
 * climate is a Fault: the card says so, and offers nothing to press.
 */
import { useState, type CSSProperties } from 'react';
import { climateHumidity, useActions, useEntities, type Entity } from '../ha';
import { climateReading, degrees, hvacActionLabel, hvacModes, stepSetpoint } from './climateState';
import { Icon } from './Icon';
import { ReadingBlock } from './ReadingBlock';
import { stateLabel } from './stateLabel';
import { t } from './theme';

export type ClimateCardProps = {
  entity: Entity;
  /** Overrides on the root box: a Widget sizes it to its own (`src/widgets`). */
  style?: CSSProperties;
};

/**
 * The setpoint as the finger left it, until Home Assistant reports the new
 * one: presses in quick succession each step from the last press, not from a
 * setpoint that has not arrived yet. The same `from === live` guard as
 * `useRowSlider`: the moment the live value changes, it wins.
 */
function useSetpoint(live: number | null) {
  const [pressed, setPressed] = useState<{ value: number; from: number | null } | null>(null);
  return {
    shown: pressed && pressed.from === live ? pressed.value : live,
    press: (value: number) => setPressed({ value, from: live }),
  };
}

export function ClimateCard({ entity, style }: ClimateCardProps) {
  const actions = useActions();
  const { current, target } = climateReading(entity);
  const setpoint = useSetpoint(target);
  const humidity = climateHumidity(entity, useEntities().values());
  const unavailable = entity.unavailable;
  const heating = entity.attributes.hvac_action === 'heating' || entity.attributes.hvac_action === 'cooling';

  const step = (direction: 1 | -1) => {
    if (setpoint.shown === null) return;
    const next = stepSetpoint(entity, setpoint.shown, direction);
    setpoint.press(next);
    actions.call('climate', 'set_temperature', entity.id, { temperature: next });
  };

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
        border: `1px solid ${unavailable ? t.color.faultLine : t.color.border}`,
        background: unavailable ? t.color.faultSurface : t.color.surface,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: t.space.sm, minWidth: 0 }}>
        <span style={{ display: 'flex', color: unavailable ? t.color.fault : t.color.textSecondary }}>
          <Icon name={unavailable ? 'mdi:alert-circle' : 'mdi:thermostat'} size={26} />
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
        <span
          style={{
            flexShrink: 0,
            fontSize: t.font.body,
            fontWeight: unavailable || heating ? 700 : 400,
            color: unavailable ? t.color.fault : heating ? t.color.activeStrong : t.color.textSecondary,
          }}
        >
          {unavailable ? stateLabel(entity).toUpperCase() : hvacActionLabel(entity)}
        </span>
      </div>

      {!unavailable && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: t.space.md }}>
            {/* The room, read from 2 m: the one number here that is not a control. */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: t.font.glanceXL, fontWeight: 300, lineHeight: 1.15, color: t.color.textPrimary }}>
                {degrees(current)}
              </span>
              {humidity !== null && (
                <span style={{ fontSize: t.font.caption, color: t.color.textSecondary }}>{Math.round(humidity)}% umidità</span>
              )}
            </div>
            <StepButton icon='mdi:minus' label='Abbassa' onPress={() => step(-1)} disabled={setpoint.shown === null} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 84 }}>
              <span style={{ fontSize: t.font.glanceL, fontWeight: 600, color: t.color.textPrimary, lineHeight: 1.2 }}>
                {degrees(setpoint.shown)}
              </span>
              <span style={{ fontSize: t.font.caption, color: t.color.textSecondary }}>impostata</span>
            </div>
            <StepButton icon='mdi:plus' label='Alza' onPress={() => step(+1)} disabled={setpoint.shown === null} />
          </div>

          <div style={{ display: 'flex', gap: t.space.sm }}>
            {hvacModes(entity).map(({ mode, label, icon }) => {
              const on = entity.state === mode;
              return (
                <button
                  key={mode}
                  type='button'
                  aria-pressed={on}
                  onClick={() => actions.call('climate', 'set_hvac_mode', entity.id, { hvac_mode: mode })}
                  style={{
                    flex: 1,
                    minHeight: t.touch.floor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: t.space.xs,
                    borderRadius: t.radius.sm,
                    border: `1px solid ${on ? 'transparent' : t.color.border}`,
                    background: on ? t.color.activeStrong : t.color.surfaceRaised,
                    color: on ? t.color.onActiveStrong : t.color.textPrimary,
                    fontSize: t.font.body,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Icon name={icon} size={22} />
                  {label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** − or + on the setpoint, at the ADR-0001 touch floor. */
function StepButton({ icon, label, onPress, disabled }: { icon: string; label: string; onPress: () => void; disabled: boolean }) {
  return (
    <button
      type='button'
      aria-label={label}
      onClick={onPress}
      disabled={disabled}
      style={{
        flexShrink: 0,
        width: t.touch.floor,
        height: t.touch.floor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        borderRadius: t.radius.sm,
        border: `1px solid ${t.color.border}`,
        background: t.color.surfaceRaised,
        color: t.color.textPrimary,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon name={icon} size={26} />
    </button>
  );
}

/**
 * A `climate` in `footer`: its name, the room's temperature and the
 * setpoint. It opens nothing of its own (#33); placed in `left` or `right`
 * on another Page too, it gets the chevron to that Page like any footer
 * member.
 */
export function ClimateBlock({ entity, style }: ClimateCardProps) {
  const { current, target } = climateReading(entity);
  return (
    <ReadingBlock
      icon='mdi:thermostat'
      value={entity.unavailable ? stateLabel(entity) : degrees(current)}
      detail={entity.unavailable ? undefined : `→ ${degrees(target)}`}
      name={entity.name}
      unavailable={entity.unavailable}
      style={style}
    />
  );
}
