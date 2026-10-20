/**
 * A Member's tap (CONTEXT.md, #73), wherever a Widget keeps Members: a Page
 * reference inside `settings`, which the server never looks into (ADR-0015).
 * So the client keeps it valid, as it keeps a Widget's `on_tap`: removing a
 * Page clears the taps to it, and duplicating a Dashboard follows them to
 * the copy's Pages.
 *
 * Read off the settings' shape, not the kind's schema: a `members` field is
 * the only setting whose items are objects with an `on_tap`, and the pure
 * modules that need this (`builder/pages.ts`, `builder/draft.ts`,
 * `renderer/popup.ts`) have no registry to ask. A plain id, as a Group saved
 * before Members wrote one, has no tap.
 *
 * No React: the tests run it under plain Node.
 */
import type { Member } from './schema';
import type { Id, Widget } from './types';

const isMember = (item: unknown): item is Member =>
  typeof item === 'object' && item !== null && !Array.isArray(item) && 'entity' in item && 'on_tap' in item;

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

/** The Page a tap on the Widget's Member for `entity` opens, as written, or `null`. */
export function memberOnTap(widget: Widget, entity: string): Id | null {
  for (const value of Object.values(widget.settings)) {
    if (!Array.isArray(value)) continue;
    const member = value.find(item => isMember(item) && item.entity === entity);
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
    const { entity, name = null, variant = null, on_tap = null } = item as Partial<Member>;
    return [{ entity: entity!, name, variant, on_tap }];
  });
}
