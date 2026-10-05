/**
 * The Dock's pure half (#41, CONTEXT.md "Dock", docs/protocol.md "The Dock"):
 * how a Page's `footer` splits into the Dock and what sits beside it.
 *
 * The Dock is Casa -- the way home, supplied by the renderer and Placed by
 * nothing -- then the Page Openers Placed in this Page's `footer`, in the
 * order `usePage` already gave them (registry order). The current Page's
 * item stays and is marked current: the one place a Page Opener is not
 * skipped on its own Page, which is why `resolvePage` keeps it in `footer`.
 *
 * No React and no @hakit (types only), so `dock.test.ts` runs it under plain
 * Node. `Dock.tsx` renders what this decides.
 */
import type { Entity, Placed } from '../ha';
// Straight from the module, not `../ha`: that index pulls in @hakit, and this
// file has to load under plain Node. `placement.ts` is pure.
import { openerPage, slugify } from '../ha/placement';

/** One destination in the Dock. */
export type DockItem = {
  key: string;
  name: string;
  icon: string;
  /** The Page it opens. */
  page: string;
  /** It is the Page on screen. */
  current: boolean;
};

/** The Page the panel rests on, and Casa's destination. */
const MAIN_PAGE = 'main';

/**
 * A Page Opener's icon: the helper's own, set in Home Assistant, else a
 * neutral arrow -- the same in the Dock and as a block.
 */
export function openerIcon(entity: Entity): string {
  const icon = entity.attributes.icon;
  return typeof icon === 'string' && icon !== '' ? icon : 'mdi:arrow-right-bold-box-outline';
}

/**
 * The Dock for `page`, or `null` when it is not shown: on `page:main`, a Dock
 * that would hold only Casa is one highlighted item that goes nowhere, a dead
 * control. Everywhere else Casa alone is still the way home, so it is shown.
 */
export function dockItems(footer: Placed[], page: string): DockItem[] | null {
  const here = slugify(page);
  const openers = footer.flatMap(p => {
    if (p.kind !== 'entity') return [];
    const opens = openerPage(p.entity);
    if (opens === null) return [];
    return [{ key: p.entity.id, name: p.entity.name, icon: openerIcon(p.entity), page: opens, current: slugify(opens) === here }];
  });
  if (here === MAIN_PAGE && openers.length === 0) return null;
  return [{ key: 'casa', name: 'Casa', icon: 'mdi:home', page: MAIN_PAGE, current: here === MAIN_PAGE }, ...openers];
}

/** What sits beside the Dock: everything in `footer` but its Page Openers, in order. */
export function besideDock(footer: Placed[]): Placed[] {
  return footer.filter(p => p.kind !== 'entity' || openerPage(p.entity) === null);
}
