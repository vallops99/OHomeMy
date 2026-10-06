/**
 * The OHomeMy document over Home Assistant's websocket (#48): read it, follow
 * it, Publish it. The shape is `src/document/types.ts`; the commands are the
 * integration's (`custom_components/ohomemy/websocket.py`).
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
} as const;

/**
 * How a Publish ended, short of the websocket failing. `conflict`: someone
 * Published since `baseRevision`, and the subscription already carries what
 * they did. `invalid`: the server found the structure wrong; `message` starts
 * with the path, e.g. `dashboards[0].home_page: ...`.
 */
export type SaveOutcome =
  { outcome: 'published'; revision: number } | { outcome: 'conflict'; message: string } | { outcome: 'invalid'; message: string };

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
export async function saveDocument(channel: DocumentChannel, document: OHomeMyDocument, baseRevision: number): Promise<SaveOutcome> {
  try {
    const { revision } = await channel.request<{ revision: number }>({
      type: DOCUMENT_COMMANDS.save,
      base_revision: baseRevision,
      document,
    });
    return { outcome: 'published', revision };
  } catch (err) {
    const code = errorCode(err);
    const message = errorMessage(err);
    if (code === 'conflict') return { outcome: 'conflict', message };
    if (code === 'invalid_document') return { outcome: 'invalid', message };
    throw err;
  }
}

// home-assistant-js-websocket rejects a command with Home Assistant's own
// `{ code, message }`, not an Error.
const errorCode = (err: unknown) => (typeof err === 'object' && err !== null && 'code' in err ? err.code : undefined);
const errorMessage = (err: unknown) =>
  typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string' ? err.message : String(err);
