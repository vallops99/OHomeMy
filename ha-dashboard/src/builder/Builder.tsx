/**
 * OHomeMy Builder (#55): the Dashboards in a Draft, Publish, history and
 * export/import; and, for one Dashboard at a time, laying out its Pages by
 * dragging on a preview (#56, `Editor.tsx`), in place of the sections.
 *
 * All the rules are in `session.ts` (the Draft against the published
 * document), `draft.ts` (what an edit does) and `history.ts`; this file
 * wires them to the websocket and to buttons.
 */
import { useEffect, useReducer, useState, type ReactNode } from 'react';
import type { OHomeMyDocument } from '../document/types';
import { useDocumentAdmin, usePublished, type ImportOutcome } from '../ha';
import { useLocalised } from '../i18n/useLocalised';
import { usePanelProps } from '../panel/panelProps';
import { DashboardList } from './DashboardList';
import { DashboardEditor } from './Editor';
import { DefaultsSection } from './DefaultsSection';
import { HistorySection } from './HistorySection';
import { messageOf } from './messageOf';
import { mapDashboard } from './pages';
import { canPublish, inConflict, isDirty, sessionReducer, type PublishOutcome, type Session } from './session';
import { strings } from './strings';
import { TransferSection } from './TransferSection';

/** A question the admin answers before something is thrown away. */
export type Confirmation = { message: string; confirmLabel: string; onConfirm: () => void };
export type Ask = (confirmation: Confirmation) => void;

export function Builder() {
  // First, so every word below is the viewer's (#59).
  const { lang, dir, style } = useLocalised();
  const published = usePublished();
  const admin = useDocumentAdmin();
  const [session, dispatch] = useReducer(sessionReducer, null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  /** The Dashboard being laid out, by id, or `null` for the list. */
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    if (published) dispatch({ type: 'received', published });
  }, [published]);

  if (!session || !admin)
    return (
      <div className='b-loading' lang={lang} dir={dir} style={style}>
        {strings.loading}
      </div>
    );

  /** Sends one Publish and hands how it ended to the session. */
  const publish = async (document: OHomeMyDocument | null, send: () => Promise<ImportOutcome>) => {
    dispatch({ type: 'publishStarted', document });
    let outcome: PublishOutcome;
    try {
      outcome = await send();
    } catch (err) {
      outcome = { outcome: 'failed', message: messageOf(err) };
    }
    dispatch({ type: 'publishEnded', outcome });
  };

  const base = session.base.revision;
  const dirty = isDirty(session);
  const conflict = inConflict(session);
  const edited = editing === null ? undefined : session.draft.dashboards.find(d => d.id === editing);

  return (
    <div className='b-app' lang={lang} dir={dir} style={style}>
      <Header
        session={session}
        onPublish={() => publish(session.draft, () => admin.save(session.draft, base))}
        onDiscard={() =>
          setConfirmation({
            message: strings.discardConfirm,
            confirmLabel: strings.discard,
            onConfirm: () => dispatch({ type: 'reverted' }),
          })
        }
      />

      <main className='b-main' data-editing={!!edited}>
        {conflict && (
          <Banner tone='alert' role='alert'>
            <strong className='b-banner-title'>{strings.conflict.title}</strong>
            <p>{strings.conflict.body(session.latest.revision)}</p>
            <p className='b-banner-note'>{strings.conflict.reloadNote}</p>
            <div className='b-actions'>
              <button className='b-button b-primary' onClick={() => dispatch({ type: 'reverted' })}>
                {strings.conflict.reload}
              </button>
            </div>
          </Banner>
        )}

        {session.notice && (
          <Banner tone={session.notice.kind === 'failed' ? 'alert' : 'neutral'} role='status'>
            <p>{session.notice.kind === 'failed' ? strings.failed(session.notice.message) : strings.published(session.notice.revision)}</p>
            <div className='b-actions'>
              <button className='b-button' onClick={() => dispatch({ type: 'dismissed' })}>
                {strings.dismiss}
              </button>
            </div>
          </Banner>
        )}

        {confirmation && (
          <Banner tone='neutral' role='alertdialog'>
            <p>{confirmation.message}</p>
            <div className='b-actions'>
              <button
                className='b-button b-primary'
                autoFocus
                onClick={() => {
                  setConfirmation(null);
                  confirmation.onConfirm();
                }}
              >
                {confirmation.confirmLabel}
              </button>
              <button className='b-button' onClick={() => setConfirmation(null)}>
                {strings.cancel}
              </button>
            </div>
          </Banner>
        )}

        {/* While a Dashboard is laid out, the sections are hidden (`editor.css`), not unmounted. */}
        {edited && (
          <DashboardEditor
            key={edited.id}
            dashboard={edited}
            edit={f => dispatch({ type: 'edited', edit: d => mapDashboard(d, edited.id, f) })}
            ask={setConfirmation}
            disabled={!!session.publishing || conflict}
            onClose={() => setEditing(null)}
          />
        )}

        <DashboardList
          base={session.base.document}
          draft={session.draft}
          disabled={!!session.publishing || conflict}
          edit={edit => dispatch({ type: 'edited', edit })}
          ask={setConfirmation}
          onEdit={setEditing}
        />

        <DefaultsSection session={session} />

        <HistorySection
          admin={admin}
          session={session}
          ask={setConfirmation}
          restore={row => publish(row.document, () => admin.save(row.document, base))}
        />

        <TransferSection
          admin={admin}
          session={session}
          dirty={dirty}
          ask={setConfirmation}
          importData={data => publish(null, () => admin.import(data, base))}
        />
      </main>
    </div>
  );
}

function Header({ session, onPublish, onDiscard }: { session: Session; onPublish: () => void; onDiscard: () => void }) {
  const { narrow } = usePanelProps();
  const dirty = isDirty(session);
  const status = session.publishing
    ? strings.status.publishing
    : inConflict(session)
      ? strings.status.conflict
      : dirty
        ? strings.status.dirty(session.base.revision)
        : strings.status.clean(session.base.revision);

  return (
    <header className='b-header'>
      {narrow && (
        // A custom panel gets no toolbar from Home Assistant, so on a narrow
        // screen this is the only way back to its sidebar.
        <button
          className='b-button b-icon'
          aria-label={strings.menu}
          onClick={e => e.currentTarget.dispatchEvent(new Event('hass-toggle-menu', { bubbles: true, composed: true }))}
        >
          ☰
        </button>
      )}
      <div className='b-heading'>
        <h1>{strings.title}</h1>
        <p className='b-status' data-state={inConflict(session) ? 'conflict' : dirty ? 'dirty' : 'clean'}>
          {status}
        </p>
      </div>
      <div className='b-actions'>
        <button className='b-button' disabled={!dirty || !!session.publishing} onClick={onDiscard}>
          {strings.discard}
        </button>
        <button className='b-button b-primary' disabled={!canPublish(session)} onClick={onPublish}>
          {strings.publish}
        </button>
      </div>
    </header>
  );
}

function Banner({ tone, role, children }: { tone: 'alert' | 'neutral'; role: string; children: ReactNode }) {
  return (
    <div className='b-banner' data-tone={tone} role={role}>
      {children}
    </div>
  );
}
