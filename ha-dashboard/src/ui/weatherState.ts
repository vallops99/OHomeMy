/**
 * A `weather` entity's conditions, in Italian (#33). Home Assistant defines a
 * closed list of fifteen; one it adds later keeps its own word rather than
 * disappearing.
 */
const CONDITIONS: Record<string, { label: string; icon: string }> = {
  'clear-night': { label: 'Sereno', icon: 'mdi:weather-night' },
  cloudy: { label: 'Nuvoloso', icon: 'mdi:weather-cloudy' },
  exceptional: { label: 'Eccezionale', icon: 'mdi:alert-circle-outline' },
  fog: { label: 'Nebbia', icon: 'mdi:weather-fog' },
  hail: { label: 'Grandine', icon: 'mdi:weather-hail' },
  lightning: { label: 'Temporale', icon: 'mdi:weather-lightning' },
  'lightning-rainy': { label: 'Temporale e pioggia', icon: 'mdi:weather-lightning-rainy' },
  partlycloudy: { label: 'Parzialmente nuvoloso', icon: 'mdi:weather-partly-cloudy' },
  pouring: { label: 'Pioggia forte', icon: 'mdi:weather-pouring' },
  rainy: { label: 'Pioggia', icon: 'mdi:weather-rainy' },
  snowy: { label: 'Neve', icon: 'mdi:weather-snowy' },
  'snowy-rainy': { label: 'Neve e pioggia', icon: 'mdi:weather-snowy-rainy' },
  sunny: { label: 'Soleggiato', icon: 'mdi:weather-sunny' },
  windy: { label: 'Ventoso', icon: 'mdi:weather-windy' },
  'windy-variant': { label: 'Ventoso e nuvoloso', icon: 'mdi:weather-windy-variant' },
};

export const conditionLabel = (condition: string): string => CONDITIONS[condition]?.label ?? condition;

export const conditionIcon = (condition: string): string => CONDITIONS[condition]?.icon ?? 'mdi:weather-cloudy-alert';

/** A forecast day's name: "Oggi" for today, else the short Italian weekday. */
export function dayLabel(datetime: string, now: Date = new Date()): string {
  const day = new Date(datetime);
  if (day.toDateString() === now.toDateString()) return 'Oggi';
  return day.toLocaleDateString('it-IT', { weekday: 'short' });
}
