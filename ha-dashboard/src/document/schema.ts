/**
 * The shared schema module (ADR-0015, #50): what makes a Widget valid.
 *
 * `types.ts` is the document's shape, which the server checks too; it leaves
 * `Widget.kind` and `Widget.settings` open. This file closes them. Each kind
 * declares a `WidgetSchema` (its Variants, whether it takes a title, and its
 * settings as a record of `FieldSpec`s) beside its component, in
 * `src/widgets/<kind>/schema.ts`, and two readers use it:
 *
 * - the renderer runs `validateWidget` on every Widget and silently skips one
 *   that fails, so a Widget from a newer Builder, or one whose entity was
 *   deleted, leaves a gap rather than an error;
 * - the Builder offers only what a schema allows: the Variants, and for each
 *   setting a control chosen by its `type` (an entity picker filtered to
 *   `domains`, a switch, a list of `options`, a number between `min` and
 *   `max`).
 *
 * The field types are the whole vocabulary a kind's settings are written in.
 * A kind that needs a new one adds it here, with its check in `checkField`
 * and its value type in `FieldValue`.
 *
 * No React, no @hakit: `schema.test.ts` runs this under plain Node, and the
 * Builder can call it on a Draft with no house connected.
 */
import { VARIANTS, type DashboardSettings, type Page, type Widget } from './types';

export type Variant = (typeof VARIANTS)[number];

/**
 * One setting of a kind. Every field is required unless it says
 * `optional: true` or has a `default`; a missing optional field reads as
 * `null`, a missing defaulted one as its default.
 */
export type FieldSpec =
  /** One entity, from these Domains (any Domain when empty). */
  | { type: 'entity'; domains: readonly string[]; optional?: boolean }
  /**
   * An ordered set of entities, from these Domains. Members Home Assistant no
   * longer has are dropped, not fatal; the Widget is skipped only if fewer
   * than `min` (default 1) are left.
   */
  | {
      type: 'entities';
      domains: readonly string[];
      min?: number;
      /** Every member of one Domain, whichever of `domains` it is: a Group. */
      sameDomain?: boolean;
    }
  /**
   * One Area, by its id in Home Assistant's area registry. `shows` is the
   * Domains of the Area's entities the Widget puts on screen without naming
   * them, as a Room Tile counts its lights: they count as shown for Faults
   * and Concerns (`./shows`). None by default.
   */
  | { type: 'area'; optional?: boolean; shows?: readonly string[] }
  /** An ordered set of Areas; dropped and counted as `entities` is. */
  | { type: 'areas'; min?: number; shows?: readonly string[] }
  | { type: 'boolean'; default: boolean }
  | { type: 'choice'; options: readonly string[]; default: string }
  | { type: 'number'; min: number; max: number; default: number; integer?: boolean }
  /** Text someone writes, shown as written. */
  | { type: 'text'; optional?: boolean; maxLength?: number }
  /** An icon name, e.g. `mdi:sofa`. */
  | { type: 'icon'; optional?: boolean };

export type Fields = Record<string, FieldSpec>;

export type WidgetSchema<F extends Fields = Fields> = {
  /** `Widget.kind`: lowercase letters, digits and underscores, e.g. `room_tile`. */
  kind: string;
  /** The Variants it has; `['full']` for a kind with one form. */
  variants: readonly Variant[];
  /** Whether it shows a title, so the Builder offers one. */
  titled: boolean;
  settings: F;
};

/** Declares a schema with its field types kept exact, so `SettingsOf` can read them. */
export function defineSchema<const F extends Fields>(schema: WidgetSchema<F>): WidgetSchema<F> {
  return schema;
}

/** What a field reads as once checked. */
export type FieldValue<S extends FieldSpec> = S extends { type: 'entity' | 'area' | 'text' | 'icon' }
  ? S extends { optional: true }
    ? string | null
    : string
  : S extends { type: 'entities' | 'areas' }
    ? string[]
    : S extends { type: 'boolean' }
      ? boolean
      : S extends { type: 'choice'; options: readonly (infer O)[] }
        ? O
        : S extends { type: 'number' }
          ? number
          : never;

/** A kind's settings, checked, defaults filled in: what its component receives. */
export type SettingsOf<F extends Fields> = { -readonly [K in keyof F]: FieldValue<F[K]> };

/**
 * What a Widget may name in the house. Optional: without it entity and Area
 * ids are checked for their spelling only, as the Builder may on a Draft.
 * Entity and Area ids are never checked on the server, and the document is
 * never rewritten when one disappears; this is where they are dropped.
 */
export type House = {
  hasEntity(id: string): boolean;
  hasArea(id: string): boolean;
};

/** The Page a Widget sits on, for checking its place on the grid. */
export type GridContext = Page['grid'] & { overflow: DashboardSettings['overflow'] };

export type Validation<F extends Fields = Fields> = { ok: true; settings: SettingsOf<F> } | { ok: false; reason: string };

/**
 * Whether `widget` is one the renderer can show, and its settings if so.
 * `schema` is the kind's, or `undefined` for a kind this frontend does not
 * know. `reason` is for the Builder and for debugging; the renderer shows
 * nothing.
 */
export function validateWidget<F extends Fields>(
  widget: Widget,
  schema: WidgetSchema<F> | undefined,
  context: { grid?: GridContext; house?: House } = {}
): Validation<F> {
  if (!schema) return fail(`unknown kind ${JSON.stringify(widget.kind)}`);
  if (!schema.variants.includes(widget.variant)) return fail(`${schema.kind} has no ${widget.variant} variant`);
  if (context.grid && !fitsGrid(widget, context.grid)) return fail('outside the grid');

  const given = widget.settings;
  if (typeof given !== 'object' || given === null || Array.isArray(given)) return fail('settings is not an object');
  for (const key of Object.keys(given)) {
    if (!(key in schema.settings)) return fail(`unknown setting ${JSON.stringify(key)}`);
  }

  const settings: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(schema.settings)) {
    const checked = checkField(spec, given[key], context.house);
    if (!checked.ok) return fail(`${key}: ${checked.reason}`);
    settings[key] = checked.value;
  }
  return { ok: true, settings: settings as SettingsOf<F> };
}

/**
 * Whether a Widget's box lies on its Page's grid: inside the columns always,
 * and inside the rows when the Dashboard fits (a scrolling Page grows rows
 * below the last). The server checks the same; the Builder uses this while
 * dragging, before there is anything to save.
 */
export function fitsGrid(widget: Pick<Widget, 'x' | 'y' | 'w' | 'h'>, grid: GridContext): boolean {
  const { x, y, w, h } = widget;
  if (![x, y, w, h].every(Number.isInteger) || x < 0 || y < 0 || w < 1 || h < 1) return false;
  if (x + w > grid.columns) return false;
  return grid.overflow === 'scroll' || y + h <= grid.rows;
}

type Checked = { ok: true; value: unknown } | { ok: false; reason: string };

const ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const AREA_ID = /^[a-z0-9_]+$/;
const ICON = /^[a-z]+:[a-z0-9-]+$/;
const TEXT_MAX = 200;

function checkField(spec: FieldSpec, value: unknown, house: House | undefined): Checked {
  switch (spec.type) {
    case 'entity':
    case 'area': {
      if (value === undefined || value === null) return spec.optional ? ok(null) : no('required');
      const id = checkId(spec, value);
      if (typeof id !== 'string') return id;
      // Gone from the house: an optional one reads as unset, a required one
      // takes the Widget with it.
      if (house && !exists(spec, id, house)) return spec.optional ? ok(null) : no(`${id} is not in Home Assistant`);
      return ok(id);
    }
    case 'entities':
    case 'areas': {
      const one = spec.type === 'entities' ? ({ type: 'entity', domains: spec.domains } as const) : ({ type: 'area' } as const);
      if (!Array.isArray(value)) return no('not a list');
      const ids: string[] = [];
      for (const item of value) {
        const id = checkId(one, item);
        if (typeof id !== 'string') return id;
        if (ids.includes(id)) return no(`${id} twice`);
        ids.push(id);
      }
      // On every id written, before any is dropped, so a Group never turns
      // valid, or changes Domain, because a member left Home Assistant.
      if (spec.type === 'entities' && spec.sameDomain && new Set(ids.map(domainOf)).size > 1) return no('not all of one Domain');
      const present = house ? ids.filter(id => exists(one, id, house)) : ids;
      const min = spec.min ?? 1;
      return present.length >= min ? ok(present) : no(`fewer than ${min}`);
    }
    case 'boolean':
      if (value === undefined) return ok(spec.default);
      return typeof value === 'boolean' ? ok(value) : no('not true or false');
    case 'choice':
      if (value === undefined) return ok(spec.default);
      return typeof value === 'string' && spec.options.includes(value) ? ok(value) : no(`not one of ${spec.options.join(', ')}`);
    case 'number':
      if (value === undefined) return ok(spec.default);
      if (typeof value !== 'number' || !Number.isFinite(value)) return no('not a number');
      if (spec.integer && !Number.isInteger(value)) return no('not a whole number');
      return value >= spec.min && value <= spec.max ? ok(value) : no(`not between ${spec.min} and ${spec.max}`);
    case 'text':
      if (value === undefined || value === null) return spec.optional ? ok(null) : no('required');
      if (typeof value !== 'string') return no('not text');
      return value.length <= (spec.maxLength ?? TEXT_MAX) ? ok(value) : no('too long');
    case 'icon':
      if (value === undefined || value === null) return spec.optional ? ok(null) : no('required');
      return typeof value === 'string' && ICON.test(value) ? ok(value) : no('not an icon name');
  }
}

/** The id itself, or why it is not one. */
function checkId(spec: { type: 'entity'; domains: readonly string[] } | { type: 'area' }, value: unknown): string | Checked {
  if (spec.type === 'area') return typeof value === 'string' && AREA_ID.test(value) ? value : no('not an Area id');
  if (typeof value !== 'string' || !ENTITY_ID.test(value)) return no('not an entity id');
  const domain = domainOf(value);
  if (spec.domains.length > 0 && !spec.domains.includes(domain)) return no(`${value} is not a ${spec.domains.join(' or ')}`);
  return value;
}

const domainOf = (entityId: string) => entityId.slice(0, entityId.indexOf('.'));

const exists = (spec: { type: 'entity' | 'area' }, id: string, house: House) =>
  spec.type === 'entity' ? house.hasEntity(id) : house.hasArea(id);

const ok = (value: unknown): Checked => ({ ok: true, value });
const no = (reason: string): Checked => ({ ok: false, reason });
const fail = (reason: string): { ok: false; reason: string } => ({ ok: false, reason });

/**
 * The title a Widget shows: the one someone wrote, exactly as written (`''`
 * shows none), or while unset its kind's Default title.
 */
export function shownTitle(title: string | null, defaultTitle: string): string {
  return title ?? defaultTitle;
}

/**
 * Whether a screen lies inside a Dashboard's supported range. Outside it the
 * Dashboard renders anyway; the Builder warns.
 */
export function inSupportedRange(screen: { width: number; height: number }, range: DashboardSettings['supported_range']): boolean {
  return (
    screen.width >= range.min.width &&
    screen.width <= range.max.width &&
    screen.height >= range.min.height &&
    screen.height <= range.max.height
  );
}
