/**
 * The Group's Default title (CONTEXT.md), by its members' Domain, in the
 * viewer's language (`group.title.<domain>`, #59): "Lights", "Locks". A
 * title someone wrote replaces it, as written (`shownTitle`).
 *
 * No React, so `title.test.ts` runs it under plain Node.
 */
import { isKey, tr, trKey } from '../../i18n';

export function groupDefaultTitle(domain: string): string {
  const key = `group.title.${domain}`;
  return isKey(key) ? trKey(key) : tr('group.title');
}
