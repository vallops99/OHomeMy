/**
 * Icon per Concern level (#8). `Health.headline` already carries the wording.
 * Its own module so a contact's tile (#34) shows an open way in exactly as the
 * Verdict's chip does.
 */
import type { HealthLevel } from '../ha';

export const LEVEL_ICON: Record<HealthLevel, string> = {
  fault: 'mdi:alert-circle',
  open: 'mdi:door-open',
  on: 'mdi:lightbulb-on',
  ok: 'mdi:check-circle',
};
