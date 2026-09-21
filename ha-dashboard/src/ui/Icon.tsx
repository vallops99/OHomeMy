/**
 * An MDI icon. ADR-0001 chose MDI over emoji because MDI tints with
 * `currentColor`: a fault icon turns red, an icon on an active surface takes
 * the active foreground, with no per-state icon set.
 *
 * Names mirror the Home Assistant area registry (`mdi:sofa`), so the
 * registry-driven pipeline resolves them rather than a hardcoded map.
 */
import { Icon as HakitIcon } from '@iconify/react';

export type IconProps = {
  /** An MDI name, with or without the `mdi:` prefix. */
  name: string;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 28, color }: IconProps) {
  const full = name.includes(':') ? name : `mdi:${name}`;
  return <HakitIcon icon={full} width={size} height={size} color={color} />;
}

/** Fallback icon per Domain, used when an Area or entity supplies none. */
export const DOMAIN_ICON: Record<string, string> = {
  light: 'mdi:lightbulb',
  switch: 'mdi:toggle-switch',
  lock: 'mdi:lock',
  cover: 'mdi:window-shutter',
  climate: 'mdi:thermostat',
  media_player: 'mdi:speaker',
  camera: 'mdi:cctv',
  vacuum: 'mdi:robot-vacuum',
  alarm_control_panel: 'mdi:shield-home',
  siren: 'mdi:bullhorn',
  binary_sensor: 'mdi:motion-sensor',
  sensor: 'mdi:gauge',
  select: 'mdi:format-list-bulleted',
};
