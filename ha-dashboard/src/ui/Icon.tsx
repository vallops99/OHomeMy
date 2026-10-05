/**
 * A line icon, drawn from Lucide (ADR-0013).
 *
 * Callers still name icons in MDI, because that is what Home Assistant hands
 * over (`mdi:sofa` on an Area, `mdi:gate` on a gate); `iconMap.ts` translates
 * the name, and an unknown one gets a neutral line glyph. Lucide strokes with
 * `currentColor`, so ADR-0001's reason for MDI survives the swap: a fault
 * icon turns `alert`, an icon on an on surface takes its foreground, with no
 * per-state icon set.
 */
import { createElement } from 'react';
import { lucideFor } from './iconMap';

export type IconProps = {
  /** An MDI name, with or without the `mdi:` prefix. */
  name: string;
  size?: number;
  color?: string;
};

/**
 * Casa Panel's stroke widths, on Lucide's 24 px grid: 1.6 by default, 1.5 at
 * room-tile size and above, heavier for small glyphs that must still read.
 */
const strokeFor = (size: number) => (size >= 30 ? 1.5 : size <= 20 ? 1.8 : 1.6);

export function Icon({ name, size = 28, color }: IconProps) {
  // `createElement` rather than JSX on a local: the glyph is a module-level
  // Lucide component looked up by name, not a component made per render.
  return createElement(lucideFor(name), { size, color: color ?? 'currentColor', strokeWidth: strokeFor(size), 'aria-hidden': true });
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
