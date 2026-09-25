/**
 * The daily forecast, read out of a `weather/subscribe_forecast` event (#33).
 *
 * Home Assistant no longer carries a forecast in a `weather` entity's
 * attributes: it is a subscription, pushed again whenever the forecast
 * changes. `useForecast` (`./useForecast`) holds the subscription; this is
 * the pure half, tested under plain Node.
 */

/** One day of the forecast. */
export type ForecastDay = { datetime: string; condition: string; high: number | null; low: number | null };

const numberOrNull = (value: unknown): number | null => (typeof value === 'number' && !Number.isNaN(value) ? value : null);

/**
 * The first `days` days of an event's forecast. An entry with no time or no
 * condition is dropped rather than drawn as a blank day.
 */
export function forecastDays(event: Record<string, unknown>, days: number): ForecastDay[] {
  const list = Array.isArray(event.forecast) ? (event.forecast as Record<string, unknown>[]) : [];
  return list
    .filter(f => typeof f.datetime === 'string' && typeof f.condition === 'string')
    .slice(0, days)
    .map(f => ({
      datetime: f.datetime as string,
      condition: f.condition as string,
      high: numberOrNull(f.temperature),
      low: numberOrNull(f.templow),
    }));
}
