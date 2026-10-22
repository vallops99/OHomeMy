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
import { fmt, tr } from '../i18n';
import { VARIANTS, type DashboardSettings, type Id, type Page, type Widget } from './types';

export type Variant = (typeof VARIANTS)[number];

/**
 * One setting of a kind. Every field is required unless it says
 * `optional: true` or has a `default`; a missing optional field reads as
 * `null`, a missing defaulted one as its default.
 */
export type FieldSpec =
  /**
   * One entity, from these Domains (any Domain when empty). `inArea` names
   * the sibling `area` setting it must be in (ADR-0018): one from another
   * Area, or that Home Assistant no longer has, reads as unset when shown,
   * and counts as shown for Faults and Concerns only in that Area. The
   * document is not rewritten.
   */
  | { type: 'entity'; domains: readonly string[]; optional?: boolean; inArea?: string }
  /**
   * An ordered set of entities, from these Domains. Members Home Assistant no
   * longer has are dropped, not fatal; the Widget is skipped only if fewer
   * than `min` (default 1) are left.
   */
  | { type: 'entities'; domains: readonly string[]; min?: number }
  /**
   * A Group's Members (CONTEXT.md, #73): an ordered set of entities as
   * `entities` is, with the same rules, each with its own name, Variant and
   * tap (`Member`). A plain id, as a Group saved before Members wrote one,
   * reads as a Member with nothing set. Only Members of `variantDomains`
   * take a Variant; on any other it is ignored.
   */
  | {
      type: 'members';
      domains: readonly string[];
      min?: number;
      variantDomains: readonly string[];
    }
  /**
   * One Area, by its id in Home Assistant's area registry. `shows` is the
   * Domains of the Area's entities the Widget puts on screen without naming
   * them, as a Room Tile counts its lights: they count as shown for Faults
   * and Concerns (`./shows`). None by default.
   */
  | { type: 'area'; optional?: boolean; shows?: readonly string[] }
  /**
   * An ordered set of Areas, dropped and counted as `entities` is, each a
   * Member with its own tap (`AreaMember`, #75): a Room Grid's. A plain id,
   * as a Room Grid saved before its Areas were Members wrote one, reads as a
   * Member with nothing set.
   */
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
  /**
   * Whether it shows a title, so the Builder offers one. `'own'`: only a
   * title someone writes, with no Default title (a Group, ADR-0017).
   */
  titled: boolean | 'own';
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
  : S extends { type: 'entities' }
    ? string[]
    : S extends { type: 'areas' }
      ? AreaMember[]
      : S extends { type: 'members' }
        ? Member[]
        : S extends { type: 'boolean' }
          ? boolean
          : S extends { type: 'choice'; options: readonly (infer O)[] }
            ? O
            : S extends { type: 'number' }
              ? number
              : never;

/**
 * One entity in a Group, with its own settings, each `null` while unset as a
 * Widget's are: its name (never `''`), its Variant, and the ordinary Page a
 * tap on it opens.
 */
export type Member = { entity: string; name: string | null; variant: Variant | null; on_tap: Id | null };

/** The Domains of a Room Tile's light: the Room Tile Widget's and a Room Grid Area's. */
export const TILE_LIGHT_DOMAINS: readonly string[] = ['light'];
/** The Domains of a Room Tile's temperature: a thermostat or a sensor. */
export const TILE_TEMPERATURE_DOMAINS: readonly string[] = ['climate', 'sensor'];

/**
 * One Area in a Room Grid (CONTEXT.md "Member", #75, #78), each `null` while
 * unset: the light its tile's switch and dimmer drive, the thermostat or
 * sensor it shows, and the ordinary Page a tap on it opens. The light and
 * temperature count only while in this Area (ADR-0018). No name or Variant
 * of its own yet.
 */
export type AreaMember = { area: string; light: string | null; temperature: string | null; on_tap: Id | null };

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
  if (!schema) return fail(tr('schema.unknownKind', { kind: JSON.stringify(widget.kind) }));
  if (!schema.variants.includes(widget.variant)) return fail(tr('schema.noVariant', { kind: schema.kind, variant: widget.variant }));
  if (context.grid && !fitsGrid(widget, context.grid)) return fail(tr('schema.outsideGrid'));

  const given = widget.settings;
  if (typeof given !== 'object' || given === null || Array.isArray(given)) return fail(tr('schema.settingsNotObject'));
  for (const key of Object.keys(given)) {
    if (!(key in schema.settings)) return fail(tr('schema.unknownSetting', { setting: JSON.stringify(key) }));
  }

  const settings: Record<string, unknown> = {};
  for (const [key, spec] of Object.entries(schema.settings)) {
    const checked = checkField(spec, given[key], context.house);
    if (!checked.ok) return fail(tr('schema.field', { setting: key, reason: checked.reason }));
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
      if (value === undefined || value === null) return spec.optional ? ok(null) : no(tr('schema.required'));
      const id = checkId(spec, value);
      if (typeof id !== 'string') return id;
      // Gone from the house: an optional one reads as unset, a required one
      // takes the Widget with it.
      if (house && !exists(spec, id, house)) return spec.optional ? ok(null) : no(tr('schema.notInHomeAssistant', { id }));
      return ok(id);
    }
    case 'entities':
    case 'areas':
    case 'members': {
      const one = spec.type === 'areas' ? ({ type: 'area' } as const) : ({ type: 'entity', domains: spec.domains } as const);
      if (!Array.isArray(value)) return no(tr('schema.notList'));
      // Each item's id, and what it reads as: the id itself, or the Member.
      const items: { id: string; read: unknown }[] = [];
      for (const item of value) {
        const read = spec.type === 'members' ? checkMember(spec, item) : spec.type === 'areas' ? checkAreaMember(item) : checkId(one, item);
        if (typeof read !== 'string' && 'ok' in read) return read;
        const id = typeof read === 'string' ? read : 'area' in read ? read.area : read.entity;
        if (items.some(i => i.id === id)) return no(tr('schema.twice', { id }));
        items.push({ id, read });
      }
      const present = house ? items.filter(i => exists(one, i.id, house)) : items;
      const min = spec.min ?? 1;
      return present.length >= min ? ok(present.map(i => i.read)) : no(tr('schema.fewerThan', { min }));
    }
    case 'boolean':
      if (value === undefined) return ok(spec.default);
      return typeof value === 'boolean' ? ok(value) : no(tr('schema.notBoolean'));
    case 'choice':
      if (value === undefined) return ok(spec.default);
      return typeof value === 'string' && spec.options.includes(value)
        ? ok(value)
        : no(tr('schema.notOneOf', { options: spec.options.join(', ') }));
    case 'number':
      if (value === undefined) return ok(spec.default);
      if (typeof value !== 'number' || !Number.isFinite(value)) return no(tr('schema.notNumber'));
      if (spec.integer && !Number.isInteger(value)) return no(tr('schema.notWhole'));
      return value >= spec.min && value <= spec.max ? ok(value) : no(tr('schema.notBetween', { min: spec.min, max: spec.max }));
    case 'text':
      if (value === undefined || value === null) return spec.optional ? ok(null) : no(tr('schema.required'));
      if (typeof value !== 'string') return no(tr('schema.notText'));
      return value.length <= (spec.maxLength ?? TEXT_MAX) ? ok(value) : no(tr('schema.tooLong'));
    case 'icon':
      if (value === undefined || value === null) return spec.optional ? ok(null) : no(tr('schema.required'));
      return typeof value === 'string' && ICON.test(value) ? ok(value) : no(tr('schema.notIcon'));
  }
}

/** The id itself, or why it is not one. */
function checkId(spec: { type: 'entity'; domains: readonly string[] } | { type: 'area' }, value: unknown): string | Checked {
  if (spec.type === 'area') return typeof value === 'string' && AREA_ID.test(value) ? value : no(tr('schema.notArea'));
  if (typeof value !== 'string' || !ENTITY_ID.test(value)) return no(tr('schema.notEntity'));
  const domain = domainOf(value);
  if (spec.domains.length > 0 && !spec.domains.includes(domain))
    return no(tr('schema.wrongDomain', { id: value, domains: fmt.list(spec.domains, 'disjunction') }));
  return value;
}

const MEMBER_KEYS: readonly string[] = ['entity', 'name', 'variant', 'on_tap'];

/** The Member, a plain id read as one with nothing set, or why it is not one. */
function checkMember(spec: Extract<FieldSpec, { type: 'members' }>, value: unknown): Member | Checked {
  const one = { type: 'entity', domains: spec.domains } as const;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    const entity = checkId(one, value);
    return typeof entity === 'string' ? { entity, name: null, variant: null, on_tap: null } : entity;
  }
  const given = value as Record<string, unknown>;
  for (const key of Object.keys(given)) {
    if (!MEMBER_KEYS.includes(key)) return no(tr('schema.unknownSetting', { setting: JSON.stringify(key) }));
  }
  const entity = checkId(one, given.entity);
  if (typeof entity !== 'string') return entity;
  const { name = null, variant = null, on_tap = null } = given;
  if (name !== null && typeof name !== 'string') return no(tr('schema.notText'));
  if (typeof name === 'string' && name.length > TEXT_MAX) return no(tr('schema.tooLong'));
  if (variant !== null && !VARIANTS.includes(variant as Variant)) return no(tr('schema.notOneOf', { options: VARIANTS.join(', ') }));
  if (on_tap !== null && typeof on_tap !== 'string') return no(tr('schema.notText'));
  return {
    entity,
    // An empty name is never written; read, it is unset.
    name: name === '' ? null : name,
    variant: spec.variantDomains.includes(domainOf(entity)) ? (variant as Variant | null) : null,
    on_tap,
  };
}

const AREA_MEMBER_KEYS: readonly string[] = ['area', 'light', 'temperature', 'on_tap'];

/** The Area as a Member, a plain id read as one with nothing set, or why it is not one. */
function checkAreaMember(value: unknown): AreaMember | Checked {
  const one = { type: 'area' } as const;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    const area = checkId(one, value);
    return typeof area === 'string' ? { area, light: null, temperature: null, on_tap: null } : area;
  }
  const given = value as Record<string, unknown>;
  for (const key of Object.keys(given)) {
    if (!AREA_MEMBER_KEYS.includes(key)) return no(tr('schema.unknownSetting', { setting: JSON.stringify(key) }));
  }
  const area = checkId(one, given.area);
  if (typeof area !== 'string') return area;
  const light = checkOptionalEntity(TILE_LIGHT_DOMAINS, given.light);
  if (typeof light !== 'string' && light !== null) return light;
  const temperature = checkOptionalEntity(TILE_TEMPERATURE_DOMAINS, given.temperature);
  if (typeof temperature !== 'string' && temperature !== null) return temperature;
  const { on_tap = null } = given;
  if (on_tap !== null && typeof on_tap !== 'string') return no(tr('schema.notText'));
  return { area, light, temperature, on_tap };
}

/** An entity of these Domains, `null` while unset, or why it is not one. */
function checkOptionalEntity(domains: readonly string[], value: unknown): string | null | Checked {
  if (value === undefined || value === null) return null;
  return checkId({ type: 'entity', domains }, value);
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
