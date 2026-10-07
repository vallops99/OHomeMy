/**
 * A `weather` entity (#33): what it is in `left` or `right`. The condition
 * now, in words, the temperature, and the next five days.
 *
 * The forecast is not an attribute any more: it arrives over a subscription
 * (`useForecast`). Until it does, the days' row is left empty rather than
 * drawn as placeholders, so the card does not change height when it lands.
 * An Unavailable weather entity is a Fault, and shows no forecast.
 */
import type { CSSProperties } from 'react';
import { useForecast, type Entity } from '../ha';
import { fmt } from '../i18n';
import { Icon } from './Icon';
import { stateLabel } from './stateLabel';
import { v } from './vars';
import { conditionIcon, conditionLabel, dayLabel } from './weatherState';

export type WeatherCardProps = {
  entity: Entity;
  /** Overrides on the root box: a Widget sizes it to its own (`src/widgets`). */
  style?: CSSProperties;
};

/** How many days the card shows: a week would not fit a 420 px column. */
const DAYS = 5;

/** A temperature, rounded: a forecast's tenths are noise. */
const whole = (value: number | null) => (value === null ? '--' : fmt.wholeDegrees(value));

export function WeatherCard({ entity, style }: WeatherCardProps) {
  const forecast = useForecast(entity.id, DAYS);
  const unavailable = entity.unavailable;
  const temperature = typeof entity.attributes.temperature === 'number' ? entity.attributes.temperature : null;

  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: v.space.md,
        padding: v.space.md,
        boxSizing: 'border-box',
        borderRadius: v.radius.tile,
        border: `1px solid ${unavailable ? v.color.alertLine : v.color.line}`,
        background: unavailable ? v.color.alertSurface : v.color.surface,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: v.space.md, minWidth: 0 }}>
        <span style={{ display: 'flex', color: unavailable ? v.color.alert : v.color.ink }}>
          <Icon name={unavailable ? 'mdi:alert-circle' : conditionIcon(entity.state)} size={48} />
        </span>
        {!unavailable && (
          <span style={{ fontSize: v.font.glanceXL, fontWeight: 300, lineHeight: 1.15, color: v.color.ink }}>{whole(temperature)}</span>
        )}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: v.font.glanceM,
              fontWeight: 600,
              color: unavailable ? v.color.alert : v.color.ink,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {unavailable ? stateLabel(entity).toUpperCase() : conditionLabel(entity.state)}
          </span>
          <span
            dir='auto'
            style={{
              fontSize: v.font.body,
              color: v.color.inkMuted,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {entity.name}
          </span>
        </div>
      </div>

      {!unavailable && (
        <div style={{ display: 'flex', gap: v.space.sm, minHeight: 92 }}>
          {(forecast ?? []).map(day => (
            <div
              key={day.datetime}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: v.space.xs,
                color: v.color.ink,
              }}
            >
              <span style={{ fontSize: v.font.caption, color: v.color.inkMuted, textTransform: 'capitalize' }}>
                {dayLabel(day.datetime)}
              </span>
              <Icon name={conditionIcon(day.condition)} size={30} />
              <span style={{ fontSize: v.font.body, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {whole(day.high)}
                {day.low !== null && <span style={{ color: v.color.inkMuted, fontWeight: 400 }}> {whole(day.low)}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
