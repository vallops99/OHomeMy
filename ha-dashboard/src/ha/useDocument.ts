/**
 * The OHomeMy document as React state (#48): `./document` wired to the
 * websocket @hakit already holds, which inside a panel is Home Assistant's own.
 *
 * Kept apart from `./document` so that file stays free of React and @hakit
 * and runs under plain Node in its tests.
 */
import { useHass } from '@hakit/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OHomeMyDocument, Published } from '../document/types';
import { saveDocument, subscribeDocument, type DocumentChannel, type SaveOutcome } from './document';

function useDocumentChannel(): DocumentChannel | null {
  const connection = useHass(s => s.connection);
  return useMemo(
    () =>
      connection && {
        request: msg => connection.sendMessagePromise(msg as { type: string }),
        // Resubscribed after a reconnect, which sends the whole document
        // again, so a Publish missed while offline is never lost.
        subscribe: (onEvent, msg) => connection.subscribeMessage(onEvent, msg as { type: string }),
      },
    [connection]
  );
}

/**
 * The published document and its revision, kept current; `null` until the
 * first answer. Each caller holds its own subscription, so call it once per
 * Dashboard or Builder and pass the result down.
 */
export function usePublished(): Published | null {
  const channel = useDocumentChannel();
  const [published, setPublished] = useState<Published | null>(null);

  useEffect(() => {
    if (!channel) return;
    let live = true;
    const unsubscribe = subscribeDocument(channel, p => {
      if (live) setPublished(p);
    });
    return () => {
      live = false;
      unsubscribe.then(unsub => unsub()).catch(() => {});
    };
  }, [channel]);

  return published;
}

/** Publishes a Draft (admin only); `null` while there is no connection. */
export function useSaveDocument(): ((document: OHomeMyDocument, baseRevision: number) => Promise<SaveOutcome>) | null {
  const channel = useDocumentChannel();
  const save = useCallback((document: OHomeMyDocument, baseRevision: number) => saveDocument(channel!, document, baseRevision), [channel]);
  return channel ? save : null;
}
