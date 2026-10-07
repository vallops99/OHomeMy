/**
 * Every word the Builder shows is one of the catalogues' `builder.*` keys
 * (`src/i18n/messages/`, #59), read with `tr` where it is shown, so a new
 * word is one catalogue entry and the values each message takes are checked
 * at the call. Nothing else in `src/builder/` writes user-facing text.
 *
 * Here are the few that are more than one lookup: a name looked up from
 * data, which may have no word, and the pieces more than one message ends
 * with.
 *
 * Text an admin writes (a Dashboard's name) is never translated. Two words
 * end up in the document, in the admin's language, for the admin to change:
 * `builder.homePageName`, a new Dashboard's first Page, and
 * `builder.dashboard.newPageName`, a new Page.
 */
import { isKey, tr, trKey } from '../i18n';

/**
 * The word for `id` under `prefix` (`builder.dashboard.kind.clock`), for a
 * name looked up from data: a kind, a setting, a Theme. `undefined` when
 * nobody wrote one, for the caller to name it otherwise.
 */
export function wordFor(prefix: string, id: string): string | undefined {
  const key = `${prefix}.${id}`;
  return isKey(key) ? trKey(key) : undefined;
}

/** What a kind is called in the palette and the inspector; a kind with no word is named from its id. */
export const kindName = (kind: string) => wordFor('builder.dashboard.kind', kind) ?? fromId(kind);

/** What a setting is called; one with no word is named from its key. */
export const settingName = (key: string) => wordFor('builder.dashboard.setting', key) ?? fromId(key);

/** `room_tile` as "Room tile": a name for a kind or setting nobody wrote one for. */
const fromId = (id: string) => (id.charAt(0).toUpperCase() + id.slice(1)).replace(/_/g, ' ');

/** " This discards your Draft." after a question, when there is one to discard. */
export const discards = (dirty: boolean) => (dirty ? ` ${tr('builder.discardsDraft')}` : '');

/** A Dashboard's address, not a word: the same in every language. */
export const dashboardUrl = (slug: string) => `/ohomemy-${slug}`;
