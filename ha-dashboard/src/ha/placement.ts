/**
 * The placement resolver.
 *
 * The frontend holds no layout (ADR-0005): what appears, on which Page, in
 * which Region, is declared in Home Assistant as a `page:` + `region:` label
 * pair on an Area or an entity (docs/protocol.md). This module is the one
 * place that reads that pair back out and turns it into the four Regions'
 * ordered contents. Nothing above this file should ever inspect a Label's
 * spelling directly -- if it needs to know what is Placed on a Page, it calls
 * `usePage`.
 *
 * #13 asked for this to live in `src/ha/`, not `src/ui/`: it is Home
 * Assistant data (ADR-0002's seam), not a component, and it must stay usable
 * without React for testing and review -- hence the pure `resolvePage` below,
 * with `usePage` as the thin hook that feeds it live registries.
 */
import { useMemo } from 'react';
import type { Area, Entity, Label } from './types';
import { useAreas, useEntities } from './registry';

/** The panel's four Regions (docs/protocol.md). Closed, unlike `page:`. */
export type Region = 'glance' | 'entities-left' | 'entities-right' | 'footer';

/**
 * The four Regions by their *slug*, which is the spelling they actually
 * arrive in. `region:entities-right` is what a human types into Home
 * Assistant's UI and what docs/protocol.md documents; `region_entities_right`
 * is what the registry hands back, because Home Assistant slugifies a Label's
 * name into its id (#12).
 *
 * The two spellings are kept side by side in one table rather than derived
 * from each other, because the collapse is one-way: `entities_right` cannot
 * be turned back into `entities-right` without knowing that this particular
 * Region has a hyphen and not an underscore in its protocol name. Matching a
 * slug against the hyphenated literal is the mistake this table exists to
 * make impossible -- it silently placed nothing at all in the two Regions
 * whose names contain a hyphen.
 */
const REGION_BY_SLUG: ReadonlyMap<string, Region> = new Map([
  ['glance', 'glance'],
  ['entities_left', 'entities-left'],
  ['entities_right', 'entities-right'],
  ['footer', 'footer'],
]);

/** One thing Placed in a Region: an Area or an entity, keeping its identity. */
export type Placed = { kind: 'area'; area: Area } | { kind: 'entity'; entity: Entity };

/** The four Regions of one Page, each already in protocol order. */
export type PageLayout = Record<Region, Placed[]>;

const emptyLayout = (): PageLayout => ({
  glance: [],
  'entities-left': [],
  'entities-right': [],
  footer: [],
});

/**
 * Home Assistant slugifies a Label's *name* into its `label_id`, and both the
 * area and entity display registries hand us the id, not the name (#12):
 * `page:main` arrives as `page_main`, `region:entities-right` as
 * `region_entities_right`. Both `:` and `-` collapse to `_`.
 *
 * That collapse is not reversible -- `page_main` could equally have been
 * typed as `page:main` or `page-main` -- which does not matter for `region:`
 * (the four Regions are known, and matched through `REGION_BY_SLUG`) but
 * does matter for `page:`, because a Page name is open-ended and arrives here
 * as a plain string from the caller, still holding its colons and hyphens.
 * Slugifying the caller's name with this same rule, then comparing
 * slug-to-slug, is what lets `usePage('main')` line up with a Label that was
 * typed as `page:main` in Home Assistant's UI (#12, option 1).
 */
const slugify = (value: string): string => value.toLowerCase().replace(/[:-]/g, '_');

/** A Label carrying a `page_` or `region_` prefix, split at the first `_`. */
type PrefixedLabel = { prefix: 'page' | 'region'; rest: string };

const PREFIX_RE = /^(page|region)_(.*)$/;

const parsePrefixed = (label: Label): PrefixedLabel | null => {
  const match = PREFIX_RE.exec(label);
  if (!match) return null;
  return { prefix: match[1] as 'page' | 'region', rest: match[2] };
};

/**
 * The Region a set of Labels resolves to, or `null` when it does not resolve
 * -- and per ADR-0005 / #10, every one of these is a silent skip, never a
 * logged or rendered fault:
 *
 * - no `page_` Label, or no `region_` Label (a half-pair)
 * - two `page_` Labels, or two `region_` Labels (doubled)
 * - a `region_` value outside the four known Regions
 * - a `page_` value that does not slugify-match the requested Page
 *
 * A bare `page_` or `region_` (nothing after the underscore) still counts as
 * *a* page or region Label for the purposes of "exactly one" -- it is not
 * treated as absent. It only ever resolves to a match if the requested Page
 * itself slugifies to the empty string, which no real Page name does, so in
 * practice it is a well-formed Label that simply never places anything.
 * `region_entities_right_extra` is the opposite shape: the prefix matches but
 * the remainder is not one of the four Region slugs, so it is an
 * unrecognised Region and skipped exactly as `region:top-left` would be.
 */
function resolveRegion(labels: Label[], pageSlug: string): Region | null {
  let pageValue: string | null = null;
  let regionValue: string | null = null;

  for (const label of labels) {
    const parsed = parsePrefixed(label);
    if (!parsed) continue;

    if (parsed.prefix === 'page') {
      if (pageValue !== null) return null; // doubled page label
      pageValue = parsed.rest;
    } else {
      if (regionValue !== null) return null; // doubled region label
      regionValue = parsed.rest;
    }
  }

  if (pageValue === null || regionValue === null) return null; // half-pair

  if (pageValue !== pageSlug) return null; // Placed, just not on this Page

  return REGION_BY_SLUG.get(regionValue) ?? null;
}

/**
 * The pure core: given the registries' current contents and a Page name,
 * produce that Page's layout. No React, no @hakit -- this is the reviewable
 * and testable half of the resolver, and `usePage` below is the only thing
 * that wraps it.
 *
 * Ordering follows docs/protocol.md exactly: within each Region, every Placed
 * Area first in registry order, then every Placed entity in registry order.
 * The two groups are never interleaved -- an entity cannot land between two
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
    const region = resolveRegion(area.labels, pageSlug);
    if (region === null) continue;
    layout[region].push({ kind: 'area', area });
  }

  for (const entity of entities.values()) {
    // `ignored` entities never reach this function at all: useEntities()
    // (src/ha/registry.ts:104) already drops any entity carrying the Label,
    // so there is nothing to mute here. Left un-double-checked deliberately
    // -- re-testing it here would suggest the mute still needs applying at
    // this layer, when for entities it has already happened upstream.
    const region = resolveRegion(entity.labels, pageSlug);
    if (region === null) continue;
    layout[region].push({ kind: 'entity', entity });
  }

  return layout;
}

/**
 * The hook: live Areas and entities, resolved into one Page's layout and
 * memoized against the registries and the Page name.
 */
export function usePage(page: string): PageLayout {
  const areas = useAreas();
  const entities = useEntities();
  return useMemo(() => resolvePage(areas, entities, page), [areas, entities, page]);
}
