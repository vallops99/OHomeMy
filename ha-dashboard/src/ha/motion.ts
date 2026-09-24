/**
 * A camera's motion, Derived (CONTEXT.md): a `motion` binary_sensor on the
 * camera's own **device**, detecting.
 *
 * Not the Area. That was the camera glance's rule until #29, and it cannot
 * tell cameras apart: the three EZVIZ cameras all sit in `esterno`, so motion
 * at the gate would light up the garden's Feed too. The device is the one
 * registry fact that says "this sensor is built into this camera".
 *
 * A camera with no device, or no motion sensor on it, never moves. No React,
 * no @hakit: `motion.test.ts` runs it under plain Node.
 */
import type { Entity } from './types';

export function cameraMoving(camera: Entity, entities: Iterable<Entity>): boolean {
  if (camera.deviceId === null) return false;
  for (const e of entities) {
    if (e.deviceId !== camera.deviceId || e.domain !== 'binary_sensor') continue;
    if (e.attributes.device_class === 'motion' && e.state === 'on') return true;
  }
  return false;
}
