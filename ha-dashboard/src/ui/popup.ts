/**
 * The Popup's pure half (#28, docs/protocol.md "Popups"): what the helper
 * says, and how a Page's Placement becomes variant D of #24 -- the Feed
 * full-bleed behind, everything else floating in one row along the bottom.
 *
 * No React and no @hakit (types only), so `popup.test.ts` runs it under
 * plain Node. `Popup.tsx` is the component that renders what this decides.
 */
import type { Area, Entity, PageLayout, Placed, Region } from '../ha';
// Straight from the module, not `../ha`: that index pulls in @hakit, and this
// file has to load under plain Node. `placement.ts` is pure.
import { slugify } from '../ha/placement';

/**
 * The Page the helper names, or `null` when no Popup is open (ADR-0009).
 *
 * The helper holds the bare Page name, `citofono`, the same string
 * `openPage()` takes. Home Assistant's `unknown`/`unavailable` arrive as the
 * state itself, and a helper that does not exist arrives as `null`; all of
 * them, and an empty value, mean closed. Nothing else is special: `main`, or
 * the Page already underneath, opens like any other (#23, decision 3).
 */
export function popupPage(helper: Entity | null): string | null {
  if (helper === null || helper.unavailable) return null;
  const page = helper.state.trim();
  return page === '' ? null : page;
}

/**
 * One item of the bottom row: what `PlacementView` renders for one Region,
 * kept with the Region whose Rendering contract it takes. Usually one Placed
 * thing; several cameras of one Region travel together, because
 * `PlacementView` folds a Region's cameras into one component.
 */
export type RowSlot = { region: Region; placed: Placed[] };

export type PopupShape = {
  /** The camera filling the screen behind everything, or `null` for the plain ground. */
  feed: Entity | null;
  /** Everything else, left to right. */
  row: RowSlot[];
  /** Nothing to show at all: the empty-Page message takes the screen. */
  empty: boolean;
};

const isCamera = (p: Placed): p is { kind: 'entity'; entity: Entity } => p.kind === 'entity' && p.entity.domain === 'camera';

/** A slot's identity: its Region and the ids it holds. Stable across renders, so usable as a React key. */
export const slotKey = (slot: RowSlot): string =>
  `${slot.region}:${slot.placed.map(p => (p.kind === 'area' ? p.area.id : p.entity.id)).join('+')}`;

/** A Region's Placed things as row slots, its cameras together where the first stood. */
function slots(region: Region, placed: Placed[]): RowSlot[] {
  const cameras = placed.filter(isCamera);
  const out: RowSlot[] = [];
  for (const p of placed) {
    if (!isCamera(p)) out.push({ region, placed: [p] });
    else if (p === cameras[0]) out.push({ region, placed: cameras });
  }
  return out;
}

/**
 * Variant D's layout, read off a Page (#24's decision, and the three points
 * it left to #28):
 *
 * - **The Feed** is the first camera Placed in `right`. With none there the
 *   background is the plain ground; with several, the others float in the row
 *   like anything else in `right`.
 * - **The row** is `left`, then the rest of `right`, then `footer`, each
 *   thing keeping its own Region's Rendering contract: an Area Placed in
 *   `footer` is still the block that opens its Page, and an Area in `left` or
 *   `right` is still a Row.
 * - **No `glance`.** A Popup is not a place to read the house's Verdict from;
 *   the quadrant collapses, the same way the helper toggle collapses it.
 */
export function popupShape(layout: PageLayout): PopupShape {
  const first = layout.right.find(isCamera);
  const feed = first?.entity ?? null;
  const rest = layout.right.filter(p => p !== first);
  const row = [...slots('left', layout.left), ...slots('right', rest), ...slots('footer', layout.footer)];
  return { feed, row, empty: feed === null && row.length === 0 };
}

/**
 * The Popup's header: the Area's own name and icon when the Page is an
 * Area's Page (`salone` reads "Soggiorno"), else the Page name itself,
 * capitalised, under a bell -- a Popup is Home Assistant calling someone to
 * the panel.
 */
export function popupTitle(page: string, areas: Area[]): { name: string; icon: string } {
  const area = areas.find(a => slugify(a.id) === slugify(page));
  const plain = page.replace(/_/g, ' ');
  const name = area?.name ?? plain.charAt(0).toUpperCase() + plain.slice(1);
  return { name, icon: area?.icon ?? 'mdi:bell-ring-outline' };
}

/**
 * Paces the activity reports: `true` for a touch that should be reported,
 * then `false` until `intervalMs` has passed since the last one reported.
 * Touches in between are dropped, not queued -- the automation only needs to
 * know someone is still there.
 */
export function activityGate(intervalMs: number): (now: number) => boolean {
  let last: number | null = null;
  return now => {
    if (last !== null && now - last < intervalMs) return false;
    last = now;
    return true;
  };
}
