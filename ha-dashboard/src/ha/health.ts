/**
 * What counts as an open way into the house, shared by the Verdict
 * (`./verdict`) and a contact's own tile so the two can never disagree (#34).
 */
import type { Entity } from './types';

/** A door, window or gate standing open is a way into the house. */
const OPENING_CLASSES = new Set(['door', 'window', 'garage', 'opening']);

export const isOpenDoor = (e: Entity) =>
  e.domain === 'binary_sensor' && OPENING_CLASSES.has(e.attributes.device_class as string) && e.state === 'on';
