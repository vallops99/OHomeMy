/**
 * What a `vacuum` can be asked to do, from its `supported_features` bitmask
 * and its state (#36). The one transport-like button starts or pauses, as a
 * player's plays or pauses; "back to the dock" is offered only while the
 * vacuum is away from it and not already going. Never a control the vacuum
 * cannot do.
 */
import type { Entity } from '../ha';

/** Home Assistant's `VacuumEntityFeature` bits, the ones the panel offers. */
const FEATURE = { pause: 4, returnHome: 16, start: 8192 } as const;

export type VacuumControls = { startPause: 'start' | 'pause' | null; dock: boolean };

export function vacuumControls(entity: Entity): VacuumControls {
  if (entity.unavailable) return { startPause: null, dock: false };
  const features = Number(entity.attributes.supported_features) || 0;
  const can = (bit: number) => (features & bit) !== 0;
  const cleaning = entity.state === 'cleaning';
  const home = entity.state === 'docked' || entity.state === 'returning';
  return {
    startPause: cleaning ? (can(FEATURE.pause) ? 'pause' : null) : can(FEATURE.start) ? 'start' : null,
    dock: can(FEATURE.returnHome) && !home,
  };
}
