/**
 * The Widget inspector's rules (#56): from a kind's schema, the controls that
 * set it, each offering only choices the schema accepts; and what setting
 * one does to a Widget's settings.
 *
 * One control per field type (`src/document/schema.ts`):
 *
 * | Field      | Control                                                     |
 * | ---------- | ----------------------------------------------------------- |
 * | `entity`   | a picker of the house's entities in the field's Domains     |
 * | `entities` | an ordered list, added to from the same picker; for a       |
 * |            | `sameDomain` field, once one is chosen, only its Domain     |
 * | `area`     | a picker of the house's Areas                               |
 * | `areas`    | an ordered list of Areas                                    |
 * | `boolean`  | a switch                                                    |
 * | `choice`   | a picker of its options                                     |
 * | `number`   | a number between its `min` and `max`, whole if `integer`    |
 * | `text`     | a line of text up to its `maxLength`                        |
 * | `icon`     | a picker of the icons Casa Panel draws                      |
 *
 * An optional field also offers "none". A value already in the Widget that
 * the house no longer has (an entity since deleted) is still listed, marked
 * `missing`, so opening the inspector never silently changes a Widget.
 *
 * No React, no @hakit: the house comes in as plain lists, and
 * `inspector.test.ts` runs this under plain Node.
 */
import type { FieldSpec, WidgetSchema } from '../document/schema';
import type { Widget } from '../document/types';
import type { Box } from './layout';

/** An entity as the pickers list it. */
export type HouseEntity = { id: string; name: string; domain: string; areaId: string | null };
export type HouseArea = { id: string; name: string };
export type HouseLists = { entities: readonly HouseEntity[]; areas: readonly HouseArea[] };

/** One choice in a picker: its value, what it reads as, and whether the house still has it. */
export type Option = { value: string; label: string; detail?: string; missing?: boolean };

export type Control =
  | { key: string; type: 'entity' | 'area' | 'icon'; value: string | null; optional: boolean; options: Option[] }
  /** `chosen` in order; `options` is what may still be added. */
  | { key: string; type: 'entities' | 'areas'; value: string[]; chosen: Option[]; options: Option[]; min: number }
  | { key: string; type: 'boolean'; value: boolean }
  | { key: string; type: 'choice'; value: string; options: Option[] }
  | { key: string; type: 'number'; value: number; min: number; max: number; step: number }
  | { key: string; type: 'text'; value: string | null; optional: boolean; maxLength: number };

const TEXT_MAX = 200;

/** Every setting of `schema` as a control, valued from the Widget's `settings`. */
export function controlsFor(
  schema: WidgetSchema,
  settings: Record<string, unknown>,
  house: HouseLists,
  icons: readonly string[]
): Control[] {
  return Object.entries(schema.settings).map(([key, spec]) => controlFor(key, spec, settings[key], house, icons));
}

function controlFor(key: string, spec: FieldSpec, raw: unknown, house: HouseLists, icons: readonly string[]): Control {
  switch (spec.type) {
    case 'entity': {
      const value = typeof raw === 'string' ? raw : null;
      return { key, type: 'entity', value, optional: !!spec.optional, options: withCurrent(entityOptions(house, spec.domains), value) };
    }
    case 'entities': {
      const value = stringList(raw);
      // A Group's members are all of one Domain: once there is one, offer
      // only that Domain (`sameDomain`, checked by `validateWidget`).
      const domains = spec.sameDomain && value.length > 0 ? [domainOf(value[0])] : spec.domains;
      const all = entityOptions(house, spec.domains);
      return {
        key,
        type: 'entities',
        value,
        chosen: value.map(id => all.find(o => o.value === id) ?? missing(id)),
        options: entityOptions(house, domains).filter(o => !value.includes(o.value)),
        min: spec.min ?? 1,
      };
    }
    case 'area': {
      const value = typeof raw === 'string' ? raw : null;
      return { key, type: 'area', value, optional: !!spec.optional, options: withCurrent(areaOptions(house), value) };
    }
    case 'areas': {
      const value = stringList(raw);
      const all = areaOptions(house);
      return {
        key,
        type: 'areas',
        value,
        chosen: value.map(id => all.find(o => o.value === id) ?? missing(id)),
        options: all.filter(o => !value.includes(o.value)),
        min: spec.min ?? 1,
      };
    }
    case 'boolean':
      return { key, type: 'boolean', value: typeof raw === 'boolean' ? raw : spec.default };
    case 'choice':
      return {
        key,
        type: 'choice',
        value: typeof raw === 'string' && spec.options.includes(raw) ? raw : spec.default,
        options: spec.options.map(o => ({ value: o, label: o })),
      };
    case 'number':
      return {
        key,
        type: 'number',
        value: typeof raw === 'number' && Number.isFinite(raw) ? raw : spec.default,
        min: spec.min,
        max: spec.max,
        step: spec.integer ? 1 : stepFor(spec),
      };
    case 'text':
      return {
        key,
        type: 'text',
        value: typeof raw === 'string' ? raw : null,
        optional: !!spec.optional,
        maxLength: spec.maxLength ?? TEXT_MAX,
      };
    case 'icon': {
      const value = typeof raw === 'string' ? raw : null;
      const options = icons.map(name => ({ value: name, label: name.replace(/^mdi:/, '') }));
      return { key, type: 'icon', value, optional: !!spec.optional, options: withCurrent(options, value) };
    }
  }
}

/** A fractional number moves by whole units over a wide range, by tenths over a narrow one. */
function stepFor(spec: { min: number; max: number }): number {
  const span = spec.max - spec.min;
  return span >= 10 ? 1 : 0.1;
}

/** Entities of these Domains (all, when none), by Area name then name. */
function entityOptions(house: HouseLists, domains: readonly string[]): Option[] {
  const areaName = new Map(house.areas.map(a => [a.id, a.name]));
  return house.entities
    .filter(e => domains.length === 0 || domains.includes(e.domain))
    .map(e => ({ value: e.id, label: e.name, detail: [e.areaId && areaName.get(e.areaId), e.id].filter(Boolean).join(' · ') }))
    .sort((a, b) => a.detail.localeCompare(b.detail) || a.label.localeCompare(b.label));
}

function areaOptions(house: HouseLists): Option[] {
  return house.areas.map(a => ({ value: a.id, label: a.name })).sort((a, b) => a.label.localeCompare(b.label));
}

/** The options, with the current value added (marked missing) if the house no longer has it. */
function withCurrent(options: Option[], value: string | null): Option[] {
  return value === null || options.some(o => o.value === value) ? options : [missing(value), ...options];
}

const missing = (value: string): Option => ({ value, label: value, missing: true });

const stringList = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : []);

const domainOf = (id: string) => id.slice(0, id.indexOf('.'));

/**
 * The Widget's settings with one field set. `null` (an optional field's
 * "none") removes the key, so the document holds only what someone chose.
 * A list is never removed, only emptied (`newWidget`).
 */
export function withSetting(settings: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  const next = { ...settings };
  if (value === null || value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

/** The list with `item` moved one place earlier (`-1`) or later (`1`). */
export function moveItem<T>(list: readonly T[], index: number, by: -1 | 1): T[] {
  const next = [...list];
  const j = index + by;
  if (index < 0 || index >= next.length || j < 0 || j >= next.length) return next;
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

/**
 * The size a kind is placed at, in cells of the default 12 x 8 grid: what it
 * needs to show its full form at 1280 x 800. A kind not listed (one added
 * later) gets a 3 x 2 box, which the admin resizes.
 */
export const DEFAULT_SIZE: Readonly<Record<string, { w: number; h: number }>> = {
  clock: { w: 4, h: 1 },
  chip_row: { w: 6, h: 1 },
  stats: { w: 4, h: 2 },
  camera_wall: { w: 8, h: 5 },
  group: { w: 4, h: 3 },
  climate: { w: 4, h: 3 },
  media: { w: 6, h: 2 },
  weather: { w: 4, h: 3 },
  alarm: { w: 4, h: 2 },
  vacuum: { w: 4, h: 2 },
  lock: { w: 4, h: 1 },
  toggle: { w: 3, h: 1 },
  sensor: { w: 3, h: 1 },
  binary_sensor: { w: 3, h: 1 },
  select: { w: 3, h: 1 },
  room_tile: { w: 3, h: 2 },
  room_grid: { w: 8, h: 4 },
  link: { w: 3, h: 1 },
  indoor_reading: { w: 4, h: 4 },
};

export const sizeFor = (kind: string) => DEFAULT_SIZE[kind] ?? { w: 3, h: 2 };

/**
 * A new Widget of this kind at `box`: its first Variant, its Default title,
 * opening nothing, with nothing chosen. Its lists start empty rather than
 * absent, since the schema takes no list as missing: a kind whose list may
 * be empty (the status chips' cameras) is valid at once. A kind with a
 * required setting (an entity) is not valid until one is chosen, and the
 * preview says so.
 */
export function newWidget(schema: WidgetSchema, id: string, box: Box): Widget {
  const settings = Object.fromEntries(
    Object.entries(schema.settings)
      .filter(([, spec]) => spec.type === 'entities' || spec.type === 'areas')
      .map(([key]) => [key, []])
  );
  return { id, kind: schema.kind, ...box, variant: schema.variants[0], title: null, on_tap: null, settings };
}
