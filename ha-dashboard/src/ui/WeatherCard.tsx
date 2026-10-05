/**
 * A `weather` entity (#33): what it is in `left` or `right`. The condition
 * now, in Italian, the temperature, and the next five days.
 *
 * The forecast is not an attribute any more: it arrives over a subscription
 * (`useForecast`). Until it does, the days' row is left empty rather than
 * drawn as placeholders, so the card does not change height when it lands.
 * An Unavailable weather entity is a Fault, and shows no forecast.
 */
import { useForecast, type Entity } from '../ha';
import { Icon } from './Icon';
import { stateLabel } from './stateLabel';
import { t } from './theme';
import { conditionIcon, conditionLabel, dayLabel } from './weatherState';

export type WeatherCardProps = { entity: Entity };

/** How many days the card shows: a week would not fit a 420 px column. */
const DAYS = 5;

/** A temperature, rounded: a forecast's tenths are noise. */
const whole = (value: number | null) => (value === null ? '--' : `${Math.round(value)}°`);

export function WeatherCard({ entity }: WeatherCardProps) {
  const forecast = useForecast(entity.id, DAYS);
  const unavailable = entity.unavailable;
  const temperature = typeof entity.attributes.temperature === 'number' ? entity.attributes.temperature : null;

  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.md,
        padding: t.space.md,
        boxSizing: 'border-box',
        borderRadius: t.radius.tile,
        border: `1px solid ${unavailable ? t.color.faultLine : t.color.border}`,
        background: unavailable ? t.color.faultSurface : t.color.surface,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: t.space.md, minWidth: 0 }}>
        <span style={{ display: 'flex', color: unavailable ? t.color.fault : t.color.textPrimary }}>
          <Icon name={unavailable ? 'mdi:alert-circle' : conditionIcon(entity.state)} size={48} />
        </span>
        {!unavailable && (
          <span style={{ fontSize: t.font.glanceXL, fontWeight: 300, lineHeight: 1.15, color: t.color.textPrimary }}>
            {whole(temperature)}
          </span>
        )}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: t.font.glanceM,
              fontWeight: 600,
              color: unavailable ? t.color.fault : t.color.textPrimary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {unavailable ? stateLabel(entity).toUpperCase() : conditionLabel(entity.state)}
          </span>
          <span
            style={{
              fontSize: t.font.body,
              color: t.color.textSecondary,
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
        <div style={{ display: 'flex', gap: t.space.sm, minHeight: 92 }}>
          {(forecast ?? []).map(day => (
            <div
              key={day.datetime}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: t.space.xs,
                color: t.color.textPrimary,
              }}
            >
              <span style={{ fontSize: t.font.caption, color: t.color.textSecondary, textTransform: 'capitalize' }}>
                {dayLabel(day.datetime)}
              </span>
              <Icon name={conditionIcon(day.condition)} size={30} />
              <span style={{ fontSize: t.font.body, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {whole(day.high)}
                {day.low !== null && <span style={{ color: t.color.textSecondary, fontWeight: 400 }}> {whole(day.low)}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
