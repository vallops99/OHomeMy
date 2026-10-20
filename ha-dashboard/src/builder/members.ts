/**
 * A Widget's Members (#73), read through its kind's schema: the one place
 * the Builder's screens ask which setting holds them.
 */
import { readMembers } from '../document/members';
import type { Member } from '../document/schema';
import type { Widget } from '../document/types';
import { widgetKind } from '../widgets/registry';
import { membersKey } from './inspector';

/** The Widget's Members as written, in full, or none for a kind without them. */
export function membersOf(widget: Widget): Member[] {
  const schema = widgetKind(widget.kind)?.schema;
  const key = schema ? membersKey(schema) : null;
  return key === null ? [] : readMembers(widget.settings[key]);
}
