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
 * A per-Domain kind's schema: titled, and one entity of the kind's own
 * Domains, which is all such a kind takes. Only its Variants differ.
 */
export function entityKindSchema<const K extends keyof typeof KIND_DOMAINS>(kind: K, variants: readonly Variant[]) {
  return defineSchema({
    kind,
    variants,
    titled: true,
    settings: {
      entity: { type: 'entity', domains: KIND_DOMAINS[kind] },
    },
  });
}
