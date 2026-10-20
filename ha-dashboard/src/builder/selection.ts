/**
 * What is selected in the preview (#56, #73): a Widget, or one Member of a
 * Group, keyed by its entity (Members are unique within a Group).
 *
 * Selection goes in one level at a time. The first tap on a Group selects
 * the Group, as on any Widget; only then are its members tappable, and a
 * tap on one selects that Member. Keys move between the levels (Enter goes
 * in, Escape comes out) and act on what is selected: a Member is removed
 * and reordered, never moved on the grid.
 *
 * No React, so `selection.test.ts` runs it under plain Node.
 */
import type { Id } from '../document/types';

export type Selection = { widget: Id; member: string | null };

/** What a tap (a press that did not drag) on the Widget `widget` selects; `member` is the member under it, if any is drawn. */
export function selectionTap(selection: Selection | null, widget: Id, member: string | null): Selection {
  if (selection?.widget === widget && member !== null) return { widget, member };
  return { widget, member: null };
}

/**
 * What a key on the selected Widget does to the selection, or `null` when
 * it is the Widget's as before (move, resize, delete). `members` are the
 * selected Group's Members by entity, in order.
 */
export function selectionKey(
  selection: Selection,
  key: string,
  shift: boolean,
  members: readonly string[]
): { selection: Selection | null } | { removeMember: string } | { moveMember: { entity: string; by: -1 | 1 } } | { handled: true } | null {
  const { widget, member } = selection;
  if (member === null) {
    if (key === 'Enter') return members.length > 0 ? { selection: { widget, member: members[0] } } : null;
    if (key === 'Escape') return { selection: null };
    return null;
  }
  if (key === 'Escape') return { selection: { widget, member: null } };
  if (key === 'Delete' || key === 'Backspace') return { removeMember: member };
  if (!shift && key === 'ArrowUp') return { moveMember: { entity: member, by: -1 } };
  if (!shift && key === 'ArrowDown') return { moveMember: { entity: member, by: 1 } };
  // Sideways, and resizing, mean nothing for a Member; they must not move the Group either.
  if (key.startsWith('Arrow')) return { handled: true };
  return null;
}

/**
 * The selection as it stands after an edit or a change of Page: nothing if
 * the Widget is not on the Page, and its Group if the Member was removed.
 * A Member Home Assistant no longer has is still in the Group, so it stays.
 */
export function shownSelection(
  selection: Selection | null,
  widgets: readonly Id[],
  membersOf: (widget: Id) => readonly string[]
): Selection | null {
  if (selection === null || !widgets.includes(selection.widget)) return null;
  if (selection.member !== null && !membersOf(selection.widget).includes(selection.member)) return { ...selection, member: null };
  return selection;
}
