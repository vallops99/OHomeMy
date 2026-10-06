/**
 * How the renderer honours a Widget's `on_tap` (#54), which every Widget has
 * whatever its kind, so no kind implements it. What the renderer does turns on
 * what the kind does with a tap of its own (`WidgetKind.tap`):
 *
 * - `box`: the kind does nothing on a tap, so its whole box opens the Page;
 * - `button`: the kind acts on a tap (a toggle toggles) and keeps it, and the
 *   renderer puts an Open button, a chevron, beside the box;
 * - `plain`: no `on_tap`, nothing added;
 * - `skipped`: a Link with nowhere to go, which would be a dead control.
 *
 * One rule for every kind and every screen: a tap never does two things, and
 * a Widget's own control is never covered.
 *
 * No React, so `tap.test.ts` runs it under plain Node.
 */
import type { Id } from '../document/types';
import type { WidgetKind } from '../widgets/types';

export type WidgetTap = { as: 'plain' } | { as: 'skipped' } | { as: 'box'; page: Id } | { as: 'button'; page: Id };

export function widgetTap(kindTap: WidgetKind['tap'], onTap: Id | null, opens: (page: Id) => boolean): WidgetTap {
  const page = onTap !== null && opens(onTap) ? onTap : null;
  const tap = kindTap ?? 'own';
  if (page === null) return tap === 'page' ? { as: 'skipped' } : { as: 'plain' };
  return tap === 'own' ? { as: 'button', page } : { as: 'box', page };
}
