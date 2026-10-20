/**
 * OHomeMy Builder (#55): the Dashboards in a Draft, Publish, history and
 * export/import; and, for one Dashboard at a time, laying out its Pages by
 * dragging on a preview (#56, `DashboardScreen.tsx`), in place of the sections.
 *
 * All the rules are in `session.ts` (the Draft against the published
 * document), `draft.ts` (what an edit does) and `history.ts`; this file
 * wires them to the websocket and to buttons.
 */
import { useEffect, useReducer, useState, type ReactNode } from 'react';
import { membersInFull } from '../document/members';
import type { OHomeMyDocument } from '../document/types';
import { useDocumentAdmin, usePublished, type ImportOutcome } from '../ha';
import { tr } from '../i18n';
import { useLocalised } from '../i18n/useLocalised';
import { usePanelProps } from '../panel/panelProps';
import { widgetKind } from '../widgets/registry';
import { DashboardList } from './DashboardList';
import { DashboardScreen } from './DashboardScreen';
import { DefaultsSection } from './DefaultsSection';
import { HistorySection } from './HistorySection';
import { messageOf } from './messageOf';
import { mapDashboard } from './pages';
import { canPublish, inConflict, isDirty, sessionReducer, type PublishOutcome, type Session } from './session';
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
        {tr('builder.loading')}
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
        onPublish={() => {
          // Every Group's Members in full (#73): an old Group saves in the new shape.
          const document = membersInFull(session.draft, kind => widgetKind(kind)?.schema);
          publish(document, () => admin.save(document, base));
        }}
        onDiscard={() =>
          setConfirmation({
            message: tr('builder.discardConfirm'),
            confirmLabel: tr('builder.discard'),
            onConfirm: () => dispatch({ type: 'reverted' }),
          })
        }
      />

      <main className='b-main' data-editing={!!edited}>
        {conflict && (
          <Banner tone='alert' role='alert'>
            <strong className='b-banner-title'>{tr('builder.conflict.title')}</strong>
            <p>{tr('builder.conflict.body', { revision: session.latest.revision })}</p>
            <p className='b-banner-note'>{tr('builder.conflict.reloadNote')}</p>
            <div className='b-actions'>
              <button className='b-button b-primary' onClick={() => dispatch({ type: 'reverted' })}>
                {tr('builder.conflict.reload')}
              </button>
            </div>
          </Banner>
        )}

        {session.notice && (
          <Banner tone={session.notice.kind === 'failed' ? 'alert' : 'neutral'} role='status'>
            <p>
              {session.notice.kind === 'failed'
                ? tr('builder.failed', { message: session.notice.message })
                : tr('builder.published', { revision: session.notice.revision })}
            </p>
            <div className='b-actions'>
              <button className='b-button' onClick={() => dispatch({ type: 'dismissed' })}>
                {tr('builder.dismiss')}
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
                {tr('builder.cancel')}
              </button>
            </div>
          </Banner>
        )}

        {/* While a Dashboard is laid out, the sections are hidden (`dashboardScreen.css`), not unmounted. */}
        {edited && (
          <DashboardScreen
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
    ? tr('builder.status.publishing')
    : inConflict(session)
      ? tr('builder.status.conflict')
      : dirty
        ? tr('builder.status.dirty', { revision: session.base.revision })
        : session.base.revision === 0
          ? tr('builder.status.none')
          : tr('builder.status.clean', { revision: session.base.revision });

  return (
    <header className='b-header'>
      {narrow && (
        // A custom panel gets no toolbar from Home Assistant, so on a narrow
        // screen this is the only way back to its sidebar.
        <button
          className='b-button b-icon'
          aria-label={tr('builder.menu')}
          onClick={e => e.currentTarget.dispatchEvent(new Event('hass-toggle-menu', { bubbles: true, composed: true }))}
        >
          ☰
        </button>
      )}
      <div className='b-heading'>
        <h1>{tr('builder.title')}</h1>
        <p className='b-status' data-state={inConflict(session) ? 'conflict' : dirty ? 'dirty' : 'clean'}>
          {status}
        </p>
      </div>
      <div className='b-actions'>
        <button className='b-button' disabled={!dirty || !!session.publishing} onClick={onDiscard}>
          {tr('builder.discard')}
        </button>
        <button className='b-button b-primary' disabled={!canPublish(session)} onClick={onPublish}>
          {tr('builder.publish')}
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
