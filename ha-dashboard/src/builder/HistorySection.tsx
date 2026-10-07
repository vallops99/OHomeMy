/**
 * The last Publishes, and undo: restoring one Publishes its document again,
 * as a new revision (`history.ts`).
 */
import { useEffect, useState } from 'react';
import type { DocumentAdmin, HistoryEntry } from '../ha';
import { fmt, tr } from '../i18n';
import type { Ask } from './Builder';
import { historyRows, undoTarget, type HistoryRow } from './history';
import { messageOf } from './messageOf';
import { canReplace, isDirty, type Session } from './session';
import { discards } from './words';

type Loaded = { history: HistoryEntry[] } | { error: string } | null;

export function HistorySection({
  admin,
  session,
  ask,
  restore,
}: {
  admin: DocumentAdmin;
  session: Session;
  ask: Ask;
  restore: (row: HistoryRow) => void;
}) {
  const revision = session.latest.revision;
  const [loaded, setLoaded] = useState<Loaded>(null);

  // Fetched again after every Publish, by anyone: the subscription carries
  // only the document, not its history.
  useEffect(() => {
    let live = true;
    admin.history().then(
      history => live && setLoaded({ history }),
      err => live && setLoaded({ error: messageOf(err) })
    );
    return () => {
      live = false;
    };
  }, [admin, revision]);

  const rows = loaded && 'history' in loaded ? historyRows(loaded.history, revision) : [];
  const undo = undoTarget(rows);
  const enabled = canReplace(session);
  const confirmRestore = (row: HistoryRow) =>
    ask({
      message: tr('builder.history.restoreConfirm', { revision: row.revision }) + discards(isDirty(session)),
      confirmLabel: tr('builder.history.restore'),
      onConfirm: () => restore(row),
    });

  return (
    <section className='b-section' aria-labelledby='b-history'>
      <div className='b-section-head'>
        <h2 id='b-history'>{tr('builder.history.title')}</h2>
        {undo && (
          <button className='b-button' disabled={!enabled} onClick={() => confirmRestore(undo)}>
            {tr('builder.history.undo', { revision: rows[0].revision })}
          </button>
        )}
      </div>

      {loaded === null && <p className='b-empty'>{tr('builder.history.loading')}</p>}
      {loaded && 'error' in loaded && <p className='b-error'>{tr('builder.history.failed', { message: loaded.error })}</p>}
      {loaded && 'history' in loaded && rows.length === 0 && <p className='b-empty'>{tr('builder.history.none')}</p>}

      <ul className='b-list'>
        {rows.map(row => (
          <li key={row.revision} className='b-row'>
            <div className='b-row-main'>
              <div className='b-row-text'>
                <span className='b-row-title'>{tr('builder.history.revision', { revision: row.revision })}</span>
                <span className='b-meta'>
                  {[
                    ...(row.savedAt ? [fmt.dateTime(new Date(row.savedAt))] : []),
                    row.document.dashboards.length === 0
                      ? tr('builder.history.empty')
                      : `${tr('builder.history.dashboards', { count: row.document.dashboards.length })}: ${row.document.dashboards.map(d => d.name).join(', ')}`,
                  ].join(' · ')}
                </span>
              </div>
              {row.current ? (
                <span className='b-chip'>{tr('builder.history.current')}</span>
              ) : (
                <div className='b-actions'>
                  <button className='b-button' disabled={!enabled} onClick={() => confirmRestore(row)}>
                    {tr('builder.history.restore')}
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
