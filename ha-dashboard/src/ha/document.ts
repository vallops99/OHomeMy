/**
 * The OHomeMy document over Home Assistant's websocket (#48): read it, follow
 * it, Publish it, and for the Builder (#55) its history, export and import.
 * The shape is `src/document/types.ts`; the commands are the integration's
 * (`custom_components/ohomemy/websocket.py`).
 *
 * No React, no @hakit: the websocket is passed in, so `document.test.ts`
 * drives this under plain Node with a fake. `useDocument` (`./useDocument`)
 * supplies the real one.
 */
import type { OHomeMyDocument, Published } from '../document/types';

/** The two ways into Home Assistant's websocket this needs. */
export type DocumentChannel = {
  /** A command with one result. */
  request: <T>(msg: Record<string, unknown>) => Promise<T>;
  /** A command whose result is a stream of events; resolves to its unsubscribe. */
  subscribe: (onEvent: (event: Record<string, unknown>) => void, msg: Record<string, unknown>) => Promise<() => Promise<void>>;
};

export const DOCUMENT_COMMANDS = {
  get: 'ohomemy/document/get',
  subscribe: 'ohomemy/document/subscribe',
  save: 'ohomemy/document/save',
  history: 'ohomemy/document/history',
  export: 'ohomemy/document/export',
  import: 'ohomemy/document/import',
} as const;

/** One past Publish, as `history` lists them. */
export type HistoryEntry = {
  revision: number;
  /** ISO 8601, UTC. */
  saved_at: string;
  /** The Home Assistant user who Published, `null` if none was known. */
  user_id: string | null;
  document: OHomeMyDocument;
};

/**
 * The document as a file someone can keep. `version` and `minor_version` are
 * the integration's storage version, so an older export is migrated on
 * import; `revision` is only a label.
 */
export type Exported = {
  version: number;
  minor_version: number;
  revision: number;
  document: OHomeMyDocument;
};

/**
 * How a Publish ended, short of the websocket failing. `conflict`: someone
 * Published since `baseRevision`, and the subscription already carries what
 * they did. `invalid`: the server found the structure wrong; `message` starts
 * with the path, e.g. `dashboards[0].home_page: ...`.
 */
export type SaveOutcome =
  { outcome: 'published'; revision: number } | { outcome: 'conflict'; message: string } | { outcome: 'invalid'; message: string };

/**
 * An import ends as a Publish does, or as `unsupported`: the file is not an
 * export, or it comes from a newer OHomeMy than the one installed.
 */
export type ImportOutcome = SaveOutcome | { outcome: 'unsupported'; message: string };

/** The document as it is now, for anyone logged in. */
export function getDocument(channel: DocumentChannel): Promise<Published> {
  return channel.request<Published>({ type: DOCUMENT_COMMANDS.get });
}

/**
 * Calls `onPublished` with the whole document at once, then again after
 * every Publish, by anyone. Resolves to the unsubscribe.
 */
export function subscribeDocument(channel: DocumentChannel, onPublished: (published: Published) => void): Promise<() => Promise<void>> {
  return channel.subscribe(event => onPublished(event as Published), { type: DOCUMENT_COMMANDS.subscribe });
}

/**
 * Publishes `document` over the revision the Draft started from. Admin only:
 * anyone else's call rejects with Home Assistant's `unauthorized`, as does a
 * lost connection, since neither is an outcome a Builder can act on.
 */
export function saveDocument(channel: DocumentChannel, document: OHomeMyDocument, baseRevision: number): Promise<SaveOutcome> {
  // The server answers `unsupported_version` only to an import.
  return publish(channel, { type: DOCUMENT_COMMANDS.save, base_revision: baseRevision, document }) as Promise<SaveOutcome>;
}

/** The last Publishes, newest first, each with its whole document. Admin only. */
export async function getHistory(channel: DocumentChannel): Promise<HistoryEntry[]> {
  const { history } = await channel.request<{ history: HistoryEntry[] }>({ type: DOCUMENT_COMMANDS.history });
  return history;
}

/** The published document as an export. Admin only. */
export function exportDocument(channel: DocumentChannel): Promise<Exported> {
  return channel.request<Exported>({ type: DOCUMENT_COMMANDS.export });
}

/**
 * Publishes an export over the revision the Draft started from. `data` is
 * whatever a file held; the server judges it. It is an ordinary Publish,
 * with the same conflict check and a history entry. Admin only.
 */
export function importDocument(channel: DocumentChannel, data: unknown, baseRevision: number): Promise<ImportOutcome> {
  return publish(channel, { type: DOCUMENT_COMMANDS.import, base_revision: baseRevision, data });
}

async function publish(channel: DocumentChannel, msg: Record<string, unknown>): Promise<ImportOutcome> {
  try {
    const { revision } = await channel.request<{ revision: number }>(msg);
    return { outcome: 'published', revision };
  } catch (err) {
    const code = errorCode(err);
    const message = errorMessage(err);
    if (code === 'conflict') return { outcome: 'conflict', message };
    if (code === 'invalid_document') return { outcome: 'invalid', message };
    if (code === 'unsupported_version') return { outcome: 'unsupported', message };
    throw err;
  }
}

// home-assistant-js-websocket rejects a command with Home Assistant's own
// `{ code, message }`, not an Error.
const errorCode = (err: unknown) => (typeof err === 'object' && err !== null && 'code' in err ? err.code : undefined);
const errorMessage = (err: unknown) =>
  typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' ? err.message : String(err);
