/**
 * Default Dashboards in the Builder (#57): what each user's choice can be,
 * what their current default points at, and whose default a Draft is about
 * to delete.
 *
 * A default is not part of the Draft. It names a panel, and only a
 * Published Dashboard has one, so setting it takes effect at once and only a
 * Published Dashboard can be chosen. A Dashboard deleted in the Draft is
 * still Published until the Draft is, and on that Publish the integration
 * clears every default naming it (`defaults.py`): its users fall back to the
 * system default, then to Home Assistant's own. Undoing that Publish gives
 * them back, unless one has been chosen since (#67).
 */
import type { Dashboard, OHomeMyDocument } from '../document/types';
import type { Defaults, UserDefault } from '../ha';

/** The URL path of a Dashboard's panel, which a default names. Fixed with the slug. */
export const panelPath = (slug: string) => `ohomemy-${slug}`;

/** What a default lands on. */
export type Target =
  /** Nothing set: a user follows the system default, the system Home Assistant's own. */
  | { kind: 'none' }
  | { kind: 'dashboard'; dashboard: Dashboard }
  /** A panel that is no Published Dashboard: Lovelace, Energy, a Dashboard since deleted. */
  | { kind: 'other'; urlPath: string };

export function targetOf(urlPath: string | null, published: OHomeMyDocument): Target {
  if (urlPath === null) return { kind: 'none' };
  const dashboard = published.dashboards.find(d => panelPath(d.slug) === urlPath);
  return dashboard ? { kind: 'dashboard', dashboard } : { kind: 'other', urlPath };
}

/** A Dashboard as a choice: Published ones can be chosen, one only in the Draft not yet. */
export type Choice = { dashboard: Dashboard; published: boolean };

/** Every Published Dashboard, in the Draft's order where it has one, then those only in the Draft. */
export function choices(published: OHomeMyDocument, draft: OHomeMyDocument): Choice[] {
  const live = new Map(published.dashboards.map(d => [d.id, d]));
  const inDraft = new Set(draft.dashboards.map(d => d.id));
  return [
    ...draft.dashboards.map(d => ({ dashboard: live.get(d.id) ?? d, published: live.has(d.id) })),
    ...published.dashboards.filter(d => !inDraft.has(d.id)).map(dashboard => ({ dashboard, published: true })),
  ];
}

/**
 * A Dashboard the Draft deletes, whose default it is, and where they land
 * once it is Published: the system default, if one survives the Publish, or
 * else Home Assistant's own.
 */
export type LostDefault = { dashboard: Dashboard; users: UserDefault[]; system: boolean; fallback: 'system' | 'home-assistant' };

/** The Dashboards deleted in the Draft that someone, or the system, has as their default. */
export function lostDefaults(base: OHomeMyDocument, draft: OHomeMyDocument, defaults: Defaults): LostDefault[] {
  const kept = new Set(draft.dashboards.map(d => d.id));
  const lost = base.dashboards
    .filter(d => !kept.has(d.id))
    .map(dashboard => {
      const path = panelPath(dashboard.slug);
      return { dashboard, users: defaults.users.filter(u => u.default_panel === path), system: defaults.system === path };
    })
    .filter(lost => lost.system || lost.users.length > 0);
  const fallback = defaults.system !== null && !lost.some(l => l.system) ? 'system' : 'home-assistant';
  return lost.map(l => ({ ...l, fallback }));
}
