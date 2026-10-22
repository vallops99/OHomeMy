/**
 * Icon per Concern level (#8). Its own module so a contact's tile (#34) shows
 * an open way in exactly as the Chip Row's chip does.
 */
import type { ConcernLevel } from '../ha/verdict';

export const LEVEL_ICON: Record<ConcernLevel, string> = {
  fault: 'mdi:alert-circle',
  open: 'mdi:door-open',
  lit: 'mdi:lightbulb-on',
};
