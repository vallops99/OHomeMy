/**
 * A Member's tap (CONTEXT.md), wherever a Widget keeps Members: a Group's
 * entities (#73) and a Room Grid's Areas (#75). A Page reference inside
 * `settings`, which the server never looks into (ADR-0015). So the client
 * keeps it valid, as it keeps a Widget's `on_tap`: removing a Page clears the
 * taps to it, and duplicating a Dashboard follows them to the copy's Pages.
 *
 * Read off the settings' shape, not the kind's schema: a list item that is
 * an object with an `on_tap` is a Member, whichever it stands for (its
 * `entity` or its `area`), since the pure modules that need this
 * (`builder/pages.ts`, `builder/draft.ts`, `renderer/popup.ts`) have no
 * registry to ask. A plain id, as a Group saved before Members wrote one, or
 * a Room Grid before its Areas were Members, has no tap.
 *
 * No React: the tests run it under plain Node.
 */
import type { AreaMember, Member, WidgetSchema } from './schema';
import type { Id, OHomeMyDocument, Widget } from './types';

/** A Member as written, of either shape: what its tap is, and what it stands for. */
type Tapped = { on_tap: Id | null; entity?: unknown; area?: unknown };

const isMember = (item: unknown): item is Tapped => typeof item === 'object' && item !== null && !Array.isArray(item) && 'on_tap' in item;

/** The entity or Area the Member stands for. */
const memberId = (member: Tapped): unknown => member.entity ?? member.area;

/** The Widget with each Member's tap passed through `f`; the same Widget when none changes. */
export function mapMemberTaps(widget: Widget, f: (page: Id) => Id | null): Widget {
  let changed = false;
  const settings = Object.fromEntries(
    Object.entries(widget.settings).map(([key, value]) => {
      if (!Array.isArray(value)) return [key, value];
      return [
        key,
        value.map(item => {
          if (!isMember(item) || item.on_tap === null) return item;
          const on_tap = f(item.on_tap);
          if (on_tap === item.on_tap) return item;
          changed = true;
          return { ...item, on_tap };
        }),
      ];
    })
  );
  return changed ? { ...widget, settings } : widget;
}

/** The Page a tap on the Widget's Member for `id`, an entity or an Area, opens, as written, or `null`. */
export function memberOnTap(widget: Widget, id: string): Id | null {
  for (const value of Object.values(widget.settings)) {
    if (!Array.isArray(value)) continue;
    const member = value.find((item): item is Tapped => isMember(item) && memberId(item) === id);
    if (member) return member.on_tap;
  }
  return null;
}

/**
 * A `members` setting as written, each Member in full, for the Builder to
 * edit: a plain id reads as a Member with nothing set, and a missing field as
 * `null`. Nothing is checked or dropped here, so a Member Home Assistant no
 * longer has stays listed; `validateWidget` decides what is shown.
 */
export function readMembers(raw: unknown): Member[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): Member[] => {
    if (typeof item === 'string') return [{ entity: item, name: null, variant: null, on_tap: null }];
    if (typeof item !== 'object' || item === null || typeof item.entity !== 'string') return [];
    const { entity, name, variant, on_tap } = item as Record<string, unknown>;
    return [
      {
        entity: entity as string,
        // As `validateWidget` reads them: an empty name is unset, and a value of the wrong type is too.
        name: typeof name === 'string' && name !== '' ? name : null,
        variant: variant === 'full' || variant === 'compact' ? variant : null,
        on_tap: typeof on_tap === 'string' ? on_tap : null,
      },
    ];
  });
}

/**
 * A Room Grid's `areas` setting as written, each Area a Member in full, for
 * the Builder to edit: a plain id reads as a Member with nothing set, and a
 * missing or mistyped light, temperature or tap as none. Nothing is checked or dropped, as `readMembers`.
 */
export function readAreaMembers(raw: unknown): AreaMember[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): AreaMember[] => {
    if (typeof item === 'string') return [{ area: item, light: null, temperature: null, on_tap: null }];
    if (typeof item !== 'object' || item === null || typeof item.area !== 'string') return [];
    const { area, light, temperature, on_tap } = item as Record<string, unknown>;
    return [
      {
        area: area as string,
        light: typeof light === 'string' ? light : null,
        temperature: typeof temperature === 'string' ? temperature : null,
        on_tap: typeof on_tap === 'string' ? on_tap : null,
      },
    ];
  });
}

/**
 * The document with every `members` and `areas` setting written in full, as a Publish
 * sends it: a Group saved before Members takes the new shape the next time
 * it is Published, edited or not. The same document when nothing changes.
 */
export function membersInFull(document: OHomeMyDocument, schemaOf: (kind: string) => WidgetSchema | undefined): OHomeMyDocument {
  const rewritten = (widget: Widget): Widget => {
    const schema = schemaOf(widget.kind);
    if (!schema) return widget;
    let settings = widget.settings;
    for (const [key, spec] of Object.entries(schema.settings)) {
      if ((spec.type !== 'members' && spec.type !== 'areas') || !(key in settings)) continue;
      const full = spec.type === 'areas' ? readAreaMembers(settings[key]) : readMembers(settings[key]);
      if (!sameJson(full, settings[key])) settings = { ...settings, [key]: full };
    }
    return settings === widget.settings ? widget : { ...widget, settings };
  };
  let changed = false;
  const dashboards = document.dashboards.map(d => {
    const pages = d.pages.map(p => {
      const widgets = p.widgets.map(rewritten);
      if (widgets.every((w, i) => w === p.widgets[i])) return p;
      changed = true;
      return { ...p, widgets };
    });
    return pages.every((p, i) => p === d.pages[i]) ? d : { ...d, pages };
  });
  return changed ? { ...document, dashboards } : document;
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
