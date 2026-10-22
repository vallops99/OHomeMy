/**
 * How the renderer honours a Widget's `on_tap` (#54), which every Widget has
 * whatever its kind, so no kind implements it. What the renderer does turns on
 * what the kind does with a tap of its own (`WidgetKind.tap`):
 *
 * - `box`: the kind does nothing on a tap, so its whole box opens the Page;
 * - `button`: the kind acts on a tap (a toggle toggles) and keeps it, and the
 *   renderer puts an Open button, a chevron, beside the box;
 * - `surface`: a Room Tile, the one named exception (below); the renderer
 *   adds nothing, and the tile draws its own way to the Page;
 * - `plain`: no `on_tap`, nothing added;
 * - `skipped`: a Link with nowhere to go, which would be a dead control.
 *
 * A Group's Member (#73) follows the same rule by its Domain rather than a
 * kind (`memberTap`): one that does nothing on a tap is a way to the Page
 * across its row, and one that acts on a tap keeps it and gains an Open
 * button at the end of its row.
 *
 * One rule for every kind and every screen: a tap never does two things, and
 * a Widget's own control is never covered. The Room Tile, a Room Tile Widget
 * or a Room Grid's Member (#75), is its one exception (ADR-0016): it acts on
 * a tap, yet its whole surface opens its Page (`roomTileTap`), except its
 * switch and dimmer, which keep theirs and stay uncovered, with a chevron to
 * say so. It never gets an Open button.
 *
 * No React, so `tap.test.ts` runs it under plain Node.
 */
import type { Id } from '../document/types';
import { TAPLESS_DOMAINS } from '../widgets/shared/domains';
import type { WidgetKind } from '../widgets/types';

export type WidgetTap =
  { as: 'plain' } | { as: 'skipped' } | { as: 'box'; page: Id } | { as: 'button'; page: Id } | { as: 'surface'; page: Id };

export function widgetTap(kindTap: WidgetKind['tap'], onTap: Id | null, opens: (page: Id) => boolean): WidgetTap {
  const page = onTap !== null && opens(onTap) ? onTap : null;
  const tap = kindTap ?? 'own';
  if (page === null) return tap === 'page' ? { as: 'skipped' } : { as: 'plain' };
  if (tap === 'surface') return { as: 'surface', page };
  return tap === 'own' ? { as: 'button', page } : { as: 'box', page };
}

/**
 * How a Room Tile honours its tap, a Room Tile Widget's `on_tap` or a Room
 * Grid Member's (ADR-0016): from its surface with a Page that exists, and
 * as if it had none otherwise. It decides on what the admin chose, never on
 * the light's state.
 */
export function roomTileTap(onTap: Id | null, opens: (page: Id) => boolean): WidgetTap {
  return widgetTap('surface', onTap, opens);
}

/** How a Member of `entity` honours its tap: never skipped, since a Member is not only a way to a Page. */
export function memberTap(entity: string, onTap: Id | null, opens: (page: Id) => boolean): WidgetTap {
  const domain = entity.slice(0, entity.indexOf('.'));
  return widgetTap(TAPLESS_DOMAINS.includes(domain) ? 'none' : 'own', onTap, opens);
}
