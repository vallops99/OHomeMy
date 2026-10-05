/**
 * The placement resolver.
 *
 * The frontend holds no layout (ADR-0005): what appears, on which Page, in
 * which Region, is declared in Home Assistant as Placement Labels,
 * `page:<page>:<region>`, on an Area or an entity -- as many as the thing has
 * Placements (ADR-0008, docs/protocol.md). This module is the one place that
 * reads them back out and turns them into the four Regions' ordered
 * contents. Nothing above this file should ever inspect a Label's spelling
 * directly -- if it needs to know what is Placed on a Page, it calls
 * `usePage`.
 *
 * #13 asked for this to live in `src/ha/`, not `src/ui/`: it is Home
 * Assistant data (ADR-0002's seam), not a component, and it must stay usable
 * without React for testing and review. So this file is only the pure
 * `resolvePage`; `usePage`, the thin hook that feeds it live registries,
 * lives beside `useAreas` and `useEntities` in `./registry`, keeping React
 * and @hakit out of this module's imports (`placement.test.ts` runs it under
 * plain Node).
 */
import type { Area, Entity, Label } from './types';

/** The panel's four Regions (docs/protocol.md). Closed, unlike a Page. */
export type Region = 'glance' | 'left' | 'right' | 'footer';

/**
 * The four Regions by their slug. None of the four names contains a `-` or
 * `_`, so a Region's slug *is* its protocol name and this is a plain lookup
 * (ADR-0008). That is load-bearing: it is what lets `parsePlacement` split a
 * slugified Placement Label at its last underscore.
 */
const REGION_BY_SLUG: ReadonlyMap<string, Region> = new Map([
  ['glance', 'glance'],
  ['left', 'left'],
  ['right', 'right'],
  ['footer', 'footer'],
]);

/** One thing Placed in a Region: an Area or an entity, keeping its identity. */
export type Placed = { kind: 'area'; area: Area } | { kind: 'entity'; entity: Entity };

/** The four Regions of one Page, each already in protocol order. */
export type PageLayout = Record<Region, Placed[]>;

const emptyLayout = (): PageLayout => ({ glance: [], left: [], right: [], footer: [] });

/**
 * Home Assistant slugifies a Label's *name* into its `label_id`, and both the
 * area and entity display registries hand us the id, not the name (#12):
 * `page:main:right` arrives as `page_main_right`. Both `:` and `-` collapse
 * to `_`.
 *
 * That collapse is not reversible -- `page_main_right` could equally have
 * been typed as `page:main-right` -- which does not matter for the Region
 * (the four are known, and matched through `REGION_BY_SLUG`) but does matter
 * for the Page, because a Page name is open-ended and arrives here as a plain
 * string from the caller, still holding its colons and hyphens. Slugifying
 * the caller's name with this same rule, then comparing slug-to-slug, is what
 * lets `usePage('main')` line up with a Label typed as `page:main:right` in
 * Home Assistant's UI (#12, option 1).
 */
export const slugify = (value: string): string => value.toLowerCase().replace(/[:-]/g, '_');

/** One Placement read out of one Placement Label: a Page slug and a Region. */
type Placement = { page: string; region: Region };

const PLACEMENT_PREFIX = 'page_';

/**
 * A slugified Placement Label, `page_<page>_<region>`, read back into its two
 * coordinates -- or `null` when it is not one, which per ADR-0005 / ADR-0008
 * is always a silent skip, never a logged or rendered fault.
 *
 * The Region is whatever follows the *last* underscore, and the Page is
 * whatever sits between `page_` and it. No Region slug contains an
 * underscore (ADR-0008), so that split is unambiguous; a Page name may
 * contain as many as it likes. What does not resolve:
 *
 * - no `page_` prefix at all -- not a Placement Label (`main`, `ignored`)
 * - no Region half, `page_main` -- its tail `main` is not a Region
 * - an unknown Region, `page_main_rigth`
 * - an empty Page, `page_footer` -- a Page named nothing, not a bare Region
 * - extra coordinates, `page_main_footer_extra` -- `extra` is not a Region
 *
 * `page_main_footer_right` is the one shape this cannot tell from a real
 * Placement: it reads as Page `main_footer`, Region `right`. It is a
 * well-formed Label for a Page nothing ever opens, so it places nothing
 * visible either way.
 */
function parsePlacement(label: Label): Placement | null {
  if (!label.startsWith(PLACEMENT_PREFIX)) return null;
  const rest = label.slice(PLACEMENT_PREFIX.length);
  const split = rest.lastIndexOf('_');
  if (split <= 0) return null; // no Region half, or nothing before it
  const region = REGION_BY_SLUG.get(rest.slice(split + 1));
  if (region === undefined) return null;
  return { page: rest.slice(0, split), region };
}

/**
 * The Regions a thing's Labels place it in on one Page, each at most once.
 * Exact duplicates are dropped here, as the Placements are collected and
 * before anything is ordered (docs/protocol.md): a thing occupies a Region
 * once. Two Labels naming this Page and *different* Regions are not
 * duplicates -- the thing renders in both.
 */
function regionsOn(labels: Label[], pageSlug: string): Set<Region> {
  const regions = new Set<Region>();
  for (const label of labels) {
    const placement = parsePlacement(label);
    if (placement === null || placement.page !== pageSlug) continue;
    regions.add(placement.region);
  }
  return regions;
}

/**
 * The pure core: given the registries' current contents and a Page name,
 * produce that Page's layout. No React, no @hakit -- this is the reviewable
 * and testable half of the resolver, and `usePage` (`./registry`) is the
 * only thing that wraps it.
 *
 * Each Placement Label is resolved on its own, so one thing can land in
 * several Regions of this Page (or none of them, if its Labels name other
 * Pages). Ordering follows docs/protocol.md exactly: within each Region,
 * every Placed Area first in registry order, then every Placed entity in
 * registry order. The two groups are never interleaved -- an entity cannot land between two
 * Areas in the same Region, so Areas are appended in one pass and entities in
 * a second.
 */
export function resolvePage(areas: Area[], entities: Map<string, Entity>, page: string): PageLayout {
  const layout = emptyLayout();
  const pageSlug = slugify(page);

  for (const area of areas) {
    // `ignored` is a mute that overrides a valid Placement (docs/protocol.md).
    // useAreas() does not filter it out -- unlike entities below, an Area
    // carrying `ignored` still arrives here, so the mute is honoured in this
    // file rather than upstream.
    if (area.labels.includes('ignored')) continue;
    for (const region of regionsOn(area.labels, pageSlug)) {
      // An Area in its own Page's footer would be a nav block that opens the
      // Page it is already on -- a dead control that looks live (ADR-0008).
      if (region === 'footer' && slugify(area.id) === pageSlug) continue;
      layout[region].push({ kind: 'area', area });
    }
  }

  for (const entity of entities.values()) {
    // `ignored` entities never reach this function at all: useEntities()
    // (src/ha/registry.ts:104) already drops any entity carrying the Label,
    // so there is nothing to mute here. Left un-double-checked deliberately
    // -- re-testing it here would suggest the mute still needs applying at
    // this layer, when for entities it has already happened upstream.
    //
    // A Page Opener on its own Page would open the Page it is already on,
    // like an Area in its own footer -- but only in `left` and `right`, where
    // it is a block (ADR-0012). In `footer` it is an item of the Dock, which
    // keeps it and marks it current: the Dock answers "where am I?"
    // (docs/protocol.md, "The Dock"). In `glance` it is a fault either way.
    const opens = openerPage(entity);
    const own = opens !== null && slugify(opens) === pageSlug;
    for (const region of regionsOn(entity.labels, pageSlug)) {
      if (own && (region === 'left' || region === 'right')) continue;
      layout[region].push({ kind: 'entity', entity });
    }
  }

  return layout;
}

/**
 * A Page Opener's Page (ADR-0012): the object id of an `input_button`, so
 * `input_button.sicurezza` opens `sicurezza`. Every Placed `input_button` is
 * one; anything else is `null`.
 */
export function openerPage(entity: Entity): string | null {
  if (entity.domain !== 'input_button') return null;
  return entity.id.slice(entity.id.indexOf('.') + 1);
}

/**
 * The other Page these entities lead to (CONTEXT.md, Derived): the Page where
 * *every* one of them is also Placed in `left` or `right`. Derived, with no
 * Label of its own: moving them moves where they lead.
 *
 * The camera glance calls it with its cameras (#29), so it opens their
 * Feeds. Everything else calls it with one entity (#32): a footer member's
 * chevron, and the temperature and consumption in `glance`.
 *
 * The current Page never qualifies, since opening it would change nothing.
 * Of several Pages that qualify, the one whose Placement Label comes first in
 * Home Assistant's label registry wins (`labelOrder`, label ids in registry
 * order); a Label the list does not hold sorts after every one it does, then
 * by Page name, so the answer never depends on the order the entities came in.
 * `null` when no Page qualifies, and then nothing leads anywhere.
 */
export function placedPageFor(members: Entity[], labelOrder: Label[], currentPage: string): string | null {
  if (members.length === 0) return null;
  const current = slugify(currentPage);

  // Each Page mapped to the registry positions of the Labels that Place a
  // member there in `left` or `right`; a Page stays a candidate only while
  // every member so far has one.
  const position = (label: Label) => {
    const i = labelOrder.indexOf(label);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  let candidates: Map<string, number> | null = null;
  for (const member of members) {
    const here = new Map<string, number>();
    for (const label of member.labels) {
      const placement = parsePlacement(label);
      if (placement === null || (placement.region !== 'left' && placement.region !== 'right')) continue;
      if (placement.page === current) continue;
      here.set(placement.page, Math.min(here.get(placement.page) ?? Number.POSITIVE_INFINITY, position(label)));
    }
    if (candidates === null) {
      candidates = here;
      continue;
    }
    for (const [page, at] of candidates) {
      const also = here.get(page);
      if (also === undefined) candidates.delete(page);
      else candidates.set(page, Math.min(at, also));
    }
  }

  const ranked = [...(candidates ?? new Map<string, number>())].sort(([pa, a], [pb, b]) => (a === b ? pa.localeCompare(pb) : a - b));
  return ranked[0]?.[0] ?? null;
}
