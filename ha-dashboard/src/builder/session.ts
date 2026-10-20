/**
 * One Builder's Draft against the published document (#55, ADR-0015), as a
 * reducer: what the subscription sends, what the admin edits, and how each
 * Publish ends.
 *
 * Three documents are in play:
 *
 * - `base`, the Published revision the Draft began from. A Publish names its
 *   revision, and the server refuses it if anyone Published since.
 * - `latest`, the newest Published the subscription has sent.
 * - `draft`, the admin's working copy. It is dirty when it differs from
 *   `base.document`.
 *
 * A clean Draft follows every Publish, by anyone, so a Builder nobody is
 * editing in always shows the house as it is. A dirty Draft never does: once
 * someone else Publishes, it is in **conflict**. It cannot be Published, and
 * the only way on is to reload, discarding it. Nothing is ever merged or
 * overwritten behind the admin's back.
 *
 * Restoring a history entry and importing a file are Publishes too, of a
 * document that is not the Draft, over the same base revision. They succeed
 * or are refused like any other.
 *
 * The admin's edits can be undone and redone (#74, `undo.ts`) until the
 * Draft is Published or replaced by anything that is not their edit: a
 * discard or reload, a clean Draft following a Publish, a Restore or an
 * import. Every stack is emptied then, whenever the Draft is `adopt`ed. In
 * conflict, Undo and Redo still work; an Undo that brings the Draft back to
 * its base makes it clean, and a clean Draft follows the latest Publish.
 */
import type { OHomeMyDocument, Published } from '../document/types';
import type { ImportOutcome } from '../ha/document';
import { sameJson } from './draft';
import { EMPTY_UNDO, recordEdit, seal, travel, type EditTarget, type Scope, type Undo } from './undo';

export type Session = {
  base: Published;
  latest: Published;
  draft: OHomeMyDocument;
  /**
   * A Publish in flight, and the document it sends: `null` for an import,
   * whose document only the server sees (it migrates an old export first).
   */
  publishing: { document: OHomeMyDocument | null } | null;
  /** The server refused a Publish because someone else Published first. */
  refused: boolean;
  /** What to tell the admin about the last Publish, until dismissed. */
  notice: Notice | null;
  /** The Undo and Redo stacks of the Draft's edits. */
  undo: Undo;
};

export type Notice =
  | { kind: 'published'; revision: number }
  /** The server refused the document (`invalid`, `unsupported`), or the call failed. */
  | { kind: 'failed'; message: string };

/** How a Publish ended: as the server answered, or `failed` if the call itself did. */
export type PublishOutcome = ImportOutcome | { outcome: 'failed'; message: string };

export type SessionEvent =
  /** The subscription sent the document, at connect or after any Publish. */
  | { type: 'received'; published: Published }
  /** An edit by the admin, recorded on the stack `on` names; without it, on none. */
  | { type: 'edited'; edit: (draft: OHomeMyDocument) => OHomeMyDocument; on?: EditTarget }
  /** Undo, or Redo, on a Dashboard's stack (its id) or the list's (`null`). */
  | { type: 'undone'; scope: Scope }
  | { type: 'redone'; scope: Scope }
  /** The admin left a field: the next edit to it is a step of its own. */
  | { type: 'sealed' }
  /** A Publish was sent: the Draft, a history entry's document, or (`null`) an import. */
  | { type: 'publishStarted'; document: OHomeMyDocument | null }
  | { type: 'publishEnded'; outcome: PublishOutcome }
  /** The Draft is thrown away for what is published now: a reload, or a discard. */
  | { type: 'reverted' }
  | { type: 'dismissed' };

export function startSession(published: Published): Session {
  return {
    base: published,
    latest: published,
    draft: published.document,
    publishing: null,
    refused: false,
    notice: null,
    undo: EMPTY_UNDO,
  };
}

export const isDirty = (s: Session) => !sameJson(s.draft, s.base.document);

/**
 * The Draft can no longer be Published: someone else Published since it
 * began, while it had changes, or the server already said so.
 */
export const inConflict = (s: Session) => s.refused || (isDirty(s) && s.latest.revision !== s.base.revision);

export const canPublish = (s: Session) => !s.publishing && isDirty(s) && !inConflict(s);

/** Whether the admin may start a Publish of something other than the Draft: a restore, an import. */
export const canReplace = (s: Session) => !s.publishing && !inConflict(s);

/** The Draft becomes what is published now, and there is nothing to undo. */
const adopt = (s: Session, latest: Published): Session => ({
  ...s,
  base: latest,
  latest,
  draft: latest.document,
  refused: false,
  undo: EMPTY_UNDO,
});

export function sessionReducer(s: Session | null, event: SessionEvent): Session | null {
  if (!s) return event.type === 'received' ? startSession(event.published) : null;

  switch (event.type) {
    case 'received': {
      const next = { ...s, latest: event.published };
      // While a Publish is out, the event may be its own echo; how it ended
      // decides. A refused Draft waits for the admin to reload.
      return s.publishing || s.refused || isDirty(s) ? next : adopt(next, event.published);
    }
    case 'edited': {
      if (s.publishing) return s;
      const draft = event.edit(s.draft);
      const undo = event.on ? recordEdit(s.undo, event.on, s.draft, draft) : s.undo;
      return { ...s, draft, undo, notice: null };
    }
    case 'undone':
    case 'redone': {
      if (s.publishing) return s;
      const moved = travel(s.undo, event.scope, event.type === 'undone' ? 'undo' : 'redo', s.draft);
      if (!moved) return s;
      const next = { ...s, draft: moved.draft, undo: moved.undo, notice: null };
      // Back to its base after someone else Published: clean, so it follows them.
      return !isDirty(next) && (next.refused || next.latest.revision !== next.base.revision) ? adopt(next, next.latest) : next;
    }
    case 'sealed': {
      const undo = seal(s.undo);
      return undo === s.undo ? s : { ...s, undo };
    }
    case 'publishStarted':
      return s.publishing ? s : { ...s, publishing: { document: event.document }, notice: null };
    case 'publishEnded':
      return s.publishing ? publishEnded(s, s.publishing.document, event.outcome) : s;
    case 'reverted':
      return { ...adopt(s, s.latest), notice: null };
    case 'dismissed':
      return { ...s, notice: null };
  }
}

function publishEnded(s: Session, sent: OHomeMyDocument | null, outcome: PublishOutcome): Session {
  const done = { ...s, publishing: null };
  switch (outcome.outcome) {
    case 'published': {
      const notice: Notice = { kind: 'published', revision: outcome.revision };
      // The subscription's echo usually comes first (the server notifies
      // before it answers). From it on, the Draft is clean and follows.
      if (done.latest.revision >= outcome.revision) return { ...adopt(done, done.latest), notice };
      // Not yet: what was sent is the base until the echo replaces it. An
      // import's document is the server's, so the Draft holds until then.
      const document = sent ?? done.draft;
      return { ...done, base: { revision: outcome.revision, document }, draft: document, refused: false, notice, undo: EMPTY_UNDO };
    }
    case 'conflict':
      return { ...done, refused: true };
    case 'invalid':
    case 'unsupported':
    case 'failed':
      return { ...done, notice: { kind: 'failed', message: outcome.message } };
  }
}
