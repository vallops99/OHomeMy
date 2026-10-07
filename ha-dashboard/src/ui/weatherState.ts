/**
 * A `weather` entity's conditions (#33), worded in the viewer's language
 * (`weather.<condition>`, #59). Home Assistant defines a closed list of
 * fifteen; one it adds later keeps its own word rather than disappearing.
 */
import { fmt, isKey, tr, trKey } from '../i18n';

const CONDITIONS: Record<string, { icon: string }> = {
  'clear-night': { icon: 'mdi:weather-night' },
  cloudy: { icon: 'mdi:weather-cloudy' },
  exceptional: { icon: 'mdi:alert-circle-outline' },
  fog: { icon: 'mdi:weather-fog' },
  hail: { icon: 'mdi:weather-hail' },
  lightning: { icon: 'mdi:weather-lightning' },
  'lightning-rainy': { icon: 'mdi:weather-lightning-rainy' },
  partlycloudy: { icon: 'mdi:weather-partly-cloudy' },
  pouring: { icon: 'mdi:weather-pouring' },
  rainy: { icon: 'mdi:weather-rainy' },
  snowy: { icon: 'mdi:weather-snowy' },
  'snowy-rainy': { icon: 'mdi:weather-snowy-rainy' },
  sunny: { icon: 'mdi:weather-sunny' },
  windy: { icon: 'mdi:weather-windy' },
  'windy-variant': { icon: 'mdi:weather-windy-variant' },
};

export function conditionLabel(condition: string): string {
  const key = `weather.${condition}`;
  return CONDITIONS[condition] && isKey(key) ? trKey(key) : condition;
}

export const conditionIcon = (condition: string): string => CONDITIONS[condition]?.icon ?? 'mdi:weather-cloudy-alert';

/** A forecast day's name: "Today" for today, else the viewer's short weekday. */
export function dayLabel(datetime: string, now: Date = new Date()): string {
  const day = new Date(datetime);
  if (day.toDateString() === now.toDateString()) return tr('weather.today');
  return fmt.weekday(day);
}
