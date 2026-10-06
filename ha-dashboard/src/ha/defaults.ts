/**
 * Default Dashboards over Home Assistant's websocket (#57): which panel each
 * user lands on at `/`, and the system's. The commands are the integration's
 * (`custom_components/ohomemy/defaults.py`), all admin only; they write the
 * same frontend storage HA's own profile and Settings → Dashboards do.
 *
 * No React, no @hakit, as `./document`: the websocket is passed in, so
 * `defaults.test.ts` runs under plain Node with a fake.
 */
import type { DocumentChannel } from './document';

export const DEFAULTS_COMMANDS = {
  subscribe: 'ohomemy/defaults/subscribe',
  setUser: 'ohomemy/defaults/set_user',
  setSystem: 'ohomemy/defaults/set_system',
} as const;

/** A Home Assistant user a person logs in as, and the panel they land on. */
export type UserDefault = {
  id: string;
  name: string;
  is_admin: boolean;
  is_active: boolean;
  /**
   * The URL path of the panel they land on (`ohomemy-wall`, `lovelace`), or
   * `null` to follow the system default. Any panel, not only an OHomeMy one:
   * the user may have chosen another in their own profile.
   */
  default_panel: string | null;
};

export type Defaults = {
  /** The panel everyone without their own default lands on; `null` is HA's own (`home`). */
  system: string | null;
  users: UserDefault[];
};

/** Calls `onDefaults` with every default now, and again whenever one or a user changes. */
export function subscribeDefaults(channel: DocumentChannel, onDefaults: (defaults: Defaults) => void): Promise<() => Promise<void>> {
  return channel.subscribe(event => onDefaults(event as Defaults), { type: DEFAULTS_COMMANDS.subscribe });
}

/**
 * Makes a published Dashboard the user's default, or (`null`) clears theirs so
 * they follow the system default. A Dashboard only in a Draft has no panel
 * yet and is refused with `unknown_dashboard`.
 */
export async function setUserDefault(channel: DocumentChannel, userId: string, dashboardId: string | null): Promise<void> {
  await channel.request({ type: DEFAULTS_COMMANDS.setUser, user_id: userId, dashboard_id: dashboardId });
}

/** Makes a published Dashboard the system default, or (`null`) gives it back to Home Assistant. */
export async function setSystemDefault(channel: DocumentChannel, dashboardId: string | null): Promise<void> {
  await channel.request({ type: DEFAULTS_COMMANDS.setSystem, dashboard_id: dashboardId });
}
