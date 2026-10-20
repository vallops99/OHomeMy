/**
 * The Builder's view of the history store (#55): the last Publishes, and
 * which one Restore goes back to.
 *
 * A Restore (CONTEXT.md) is a Publish, never a rewind. Restoring a past
 * revision Publishes its document again over the current revision, as a new
 * revision, with the same conflict check as any other; the history only
 * grows. It is not Undo, which takes back edits to the Draft (`undo.ts`).
 */
import { emptyDocument, type OHomeMyDocument } from '../document/types';
import type { HistoryEntry } from '../ha/document';

export type HistoryRow = {
  revision: number;
  /** `null` for revision 0, the empty document nobody Published. */
  savedAt: string | null;
  userId: string | null;
  document: OHomeMyDocument;
  /** The revision every Dashboard shows now. */
  current: boolean;
};

/**
 * The history, newest first, as the Builder lists it. When it reaches back
 * to revision 1, revision 0 (no Dashboards) is listed after it, so even the
 * Draft before the first Publish can be Restored.
 */
export function historyRows(history: HistoryEntry[], currentRevision: number): HistoryRow[] {
  const rows: HistoryRow[] = history.map(e => ({
    revision: e.revision,
    savedAt: e.saved_at,
    userId: e.user_id,
    document: e.document,
    current: e.revision === currentRevision,
  }));
  if (rows.at(-1)?.revision === 1) {
    rows.push({ revision: 0, savedAt: null, userId: null, document: emptyDocument(), current: currentRevision === 0 });
  }
  return rows;
}

/**
 * What "Restore revision N" goes back to: the row just before the current
 * one, or `null` when there is none, or the history is not of the current
 * revision (it is fetched again after each Publish, so it can lag).
 */
export function restoreTarget(rows: HistoryRow[]): HistoryRow | null {
  return rows[0]?.current ? (rows[1] ?? null) : null;
}
