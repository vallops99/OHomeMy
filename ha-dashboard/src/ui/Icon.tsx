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

/**
 * The icon Home Assistant itself would show for an entity.
 *
 * Home Assistant picks an entity's icon in a fixed order: a custom `icon` set
 * in the entity registry, then a device-class default, then the Domain's own
 * default -- and for several Domains the default is *stateful*, so a locked
 * lock and an unlocked one are different glyphs. This mirrors that order, so
 * the panel shows the glyph the owner already recognises from Home Assistant
 * rather than one the dashboard invented.
 *
 * Derived, like everything else (CONTEXT.md): it asks the entity what it is,
 * never which entity it is.
 */
export function entityIcon(entity: { domain: string; state: string; attributes: Record<string, unknown> }): string {
  // A custom icon set in Home Assistant always wins. It arrives as a state
  // attribute rather than on the registry entry -- Home Assistant resolves
  // the customisation before sending state, so `attributes.icon` is where a
  // registry override shows up. (Both gates carry one: `mdi:gate` and
  // `mdi:door-sliding`, set in Home Assistant's own UI.)
  const custom = entity.attributes.icon;
  if (typeof custom === 'string' && custom) return custom;

  const stateful = STATEFUL_DOMAIN_ICON[entity.domain];
  if (stateful) return stateful(entity.state);

  return DOMAIN_ICON[entity.domain] ?? 'mdi:help-circle-outline';
}

/**
 * Domains whose default icon depends on state, as Home Assistant's own
 * frontend renders them.
 */
const STATEFUL_DOMAIN_ICON: Record<string, (state: string) => string> = {
  // `mdi:lock` / `mdi:lock-open`, never `mdi:gate`: a gate is a `lock` in
  // Home Assistant and this is the glyph it shows for one.
  lock: state => (state === 'unlocked' || state === 'open' ? 'mdi:lock-open' : 'mdi:lock'),
  light: state => (state === 'on' ? 'mdi:lightbulb' : 'mdi:lightbulb-outline'),
  switch: state => (state === 'on' ? 'mdi:toggle-switch-variant' : 'mdi:toggle-switch-variant-off'),
};

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
