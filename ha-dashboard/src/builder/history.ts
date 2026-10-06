/**
 * The Builder's view of the history store (#55): the last Publishes, and
 * what undoing one restores.
 *
 * Undo is a Publish, never a rewind. Restoring a past revision Publishes its
 * document again over the current revision, as a new revision, with the
 * same conflict check as any other; the history only grows. Undoing the
 * latest Publish restores the revision before it.
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
 * first Publish can be undone.
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
 * What "Undo the last Publish" restores: the row just before the current
 * one, or `null` when there is none, or the history is not of the current
 * revision (it is fetched again after each Publish, so it can lag).
 */
export function undoTarget(rows: HistoryRow[]): HistoryRow | null {
  return rows[0]?.current ? (rows[1] ?? null) : null;
}
