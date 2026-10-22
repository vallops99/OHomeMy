/**
 * A Widget's Members (#73, #78), read through its kind's schema: the one
 * place the Builder's screens ask which setting holds them.
 */
import { readAreaMembers, readMembers } from '../document/members';
import type { AreaMember, Member } from '../document/schema';
import type { Widget } from '../document/types';
import { widgetKind } from '../widgets/registry';
import { memberKeys, membersSetting } from './inspector';

/** The Widget's Members by key, in order: entity ids for a Group, Area ids for a Room Grid; none for a kind without. */
export function membersOf(widget: Widget): string[] {
  const schema = widgetKind(widget.kind)?.schema;
  return schema ? memberKeys(schema, widget.settings) : [];
}

/** The Widget's Member for `key` as written, in full: a Group's (`member`) or a Room Grid's (`area`), or none. */
export function memberOf(widget: Widget, key: string): { member: Member } | { area: AreaMember } | null {
  const schema = widgetKind(widget.kind)?.schema;
  const found = schema ? membersSetting(schema) : null;
  if (!found) return null;
  if (found.type === 'areas') {
    const area = readAreaMembers(widget.settings[found.key]).find(m => m.area === key);
    return area ? { area } : null;
  }
  const member = readMembers(widget.settings[found.key]).find(m => m.entity === key);
  return member ? { member } : null;
}
