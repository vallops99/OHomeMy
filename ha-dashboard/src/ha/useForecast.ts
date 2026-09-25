/**
 * A `weather` entity's daily forecast, live (#33).
 *
 * Home Assistant pushes the forecast over `weather/subscribe_forecast` rather
 * than carrying it as an attribute, so this holds a subscription for as long
 * as the card is mounted. Like `useFeed`, it is a file of its own in
 * `src/ha/` because it touches @hakit, and only for the websocket connection;
 * reading the event is `forecastDays` (`./forecast`).
 */
import { useHass } from '@hakit/core';
import { useEffect, useState } from 'react';
import { forecastDays, type ForecastDay } from './forecast';
import type { EntityId } from './types';

/**
 * The first `days` days of the daily forecast, or `null` until the first
 * answer -- and for good when the entity offers no daily forecast, since
 * there is nothing more to wait for then either.
 */
export function useForecast(entityId: EntityId, days: number): ForecastDay[] | null {
  const connection = useHass(s => s.connection);
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null);

  useEffect(() => {
    if (!connection) return;
    let live = true;
    const unsubscribe = connection
      .subscribeMessage<Record<string, unknown>>(
        event => {
          if (live) setForecast(forecastDays(event, days));
        },
        { type: 'weather/subscribe_forecast', entity_id: entityId, forecast_type: 'daily' }
      )
      .catch(() => null);
    return () => {
      live = false;
      unsubscribe.then(unsub => unsub?.()).catch(() => {});
    };
  }, [connection, entityId, days]);

  return forecast;
}
