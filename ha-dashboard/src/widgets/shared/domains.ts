/**
 * Which Domains each per-Domain Widget kind stands for (#52), in one place:
 * each kind's schema offers its own list, and a Group offers every Domain one
 * of them gives a shape. No React, so the schemas stay testable under Node.
 *
 * Cameras are not here: several of them are a Camera Wall, never a Group.
 */
import { defineSchema, type Variant } from '../../document/schema';

export const KIND_DOMAINS = {
  toggle: ['light', 'switch', 'fan', 'input_boolean', 'siren'],
  lock: ['lock'],
  alarm: ['alarm_control_panel'],
  climate: ['climate'],
  media: ['media_player'],
  vacuum: ['vacuum'],
  weather: ['weather'],
  sensor: ['sensor'],
  binary_sensor: ['binary_sensor'],
  select: ['select'],
} as const;

/** Every Domain a Group may hold: each is drawn in its own kind's shape. */
export const GROUP_DOMAINS: readonly string[] = Object.values(KIND_DOMAINS).flat();

/**
 * The Domains whose kind has both Variants: a Group's Member of one takes a
 * Variant of its own (#73). Lock, vacuum and select have one form.
 */
export const VARIANT_DOMAINS: readonly string[] = [
  ...KIND_DOMAINS.toggle,
  ...KIND_DOMAINS.alarm,
  ...KIND_DOMAINS.climate,
  ...KIND_DOMAINS.media,
  ...KIND_DOMAINS.weather,
  ...KIND_DOMAINS.sensor,
  ...KIND_DOMAINS.binary_sensor,
];

/**
 * The Domains whose shape does nothing on a tap: a Member of one with a tap
 * is a way to its Page across its row. Every other Domain acts on a tap (a
 * light toggles, a gate holds to open), keeps it, and the Member gets an
 * Open button instead (`renderer/tap.ts`, #73).
 */
export const TAPLESS_DOMAINS: readonly string[] = [...KIND_DOMAINS.weather, ...KIND_DOMAINS.sensor, ...KIND_DOMAINS.binary_sensor];

/**
 * A per-Domain kind's schema: titled, and one entity of the kind's own
 * Domains, which is all such a kind takes. Only its Variants differ.
 */
export function entityKindSchema<const K extends keyof typeof KIND_DOMAINS>(
  kind: K,
  variants: readonly Variant[],
  malfunction?: readonly string[]
) {
  return defineSchema({
    kind,
    variants,
    titled: true,
    settings: {
      entity: { type: 'entity', domains: KIND_DOMAINS[kind], ...(malfunction && { malfunction }) },
    },
  });
}
