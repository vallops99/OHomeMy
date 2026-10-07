/**
 * Default Dashboards (#57): for each person, and for everyone else, the
 * Dashboard they land on at `/`. Not part of the Draft: a choice is written
 * at once, and only a Published Dashboard can be chosen (`defaults.ts`).
 *
 * It also warns while the Draft deletes a Dashboard someone has as their
 * default, since Publishing it clears theirs.
 */
import { useState } from 'react';
import type { OHomeMyDocument } from '../document/types';
import { useDefaults } from '../ha';
import { fmt, tr } from '../i18n';
import { choices, lostDefaults, targetOf, type Choice } from './defaults';
import { messageOf } from './messageOf';
import type { Session } from './session';

/** Who a row is for: a user's id, or the system default. */
const SYSTEM = '';

export function DefaultsSection({ session }: { session: Session }) {
  const { defaults, error, admin } = useDefaults();
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [failure, setFailure] = useState<string | null>(null);

  const published = session.latest.document;
  const options = choices(published, session.draft);
  const lost = defaults ? lostDefaults(session.base.document, session.draft, defaults) : [];

  const choose = async (key: string, name: string, dashboardId: string | null) => {
    if (!admin) return;
    setFailure(null);
    setPending(p => new Set(p).add(key));
    try {
      await (key === SYSTEM ? admin.setSystem(dashboardId) : admin.setUser(key, dashboardId));
    } catch (err) {
      setFailure(tr('builder.defaults.setFailed', { name, message: messageOf(err) }));
    } finally {
      setPending(p => {
        const next = new Set(p);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <section className='b-section' aria-labelledby='b-defaults'>
      <div className='b-section-head'>
        <h2 id='b-defaults'>{tr('builder.defaults.title')}</h2>
      </div>
      <p className='b-meta'>{tr('builder.defaults.body')}</p>

      {lost.map(({ dashboard, users, system, fallback }) => (
        <div key={dashboard.id} className='b-banner b-defaults-lost' role='status'>
          <strong className='b-banner-title'>{tr('builder.defaults.lostTitle')}</strong>
          <p>
            {tr(fallback === 'system' ? 'builder.defaults.lostToSystem' : 'builder.defaults.lost', {
              name: dashboard.name,
              who: fmt.list([...users.map(u => u.name), ...(system ? [tr('builder.defaults.systemName')] : [])]),
            })}
          </p>
        </div>
      ))}

      {error != null && <p className='b-error'>{tr('builder.defaults.failed', { message: messageOf(error) })}</p>}
      {failure && (
        <p className='b-error' role='alert'>
          {failure}
        </p>
      )}
      {!defaults && error == null && <p className='b-empty'>{tr('builder.defaults.loading')}</p>}

      {defaults && (
        <ul className='b-list'>
          <DefaultRow
            title={tr('builder.defaults.system')}
            meta={tr('builder.defaults.systemMeta')}
            label={tr('builder.defaults.choose', { name: tr('builder.defaults.systemName') })}
            current={defaults.system}
            published={published}
            options={options}
            busy={pending.has(SYSTEM)}
            onChoose={id => choose(SYSTEM, tr('builder.defaults.systemName'), id)}
          />
          {defaults.users.map(user => (
            <DefaultRow
              key={user.id}
              title={user.name}
              meta={[
                ...(user.is_admin ? [tr('builder.defaults.admin')] : []),
                ...(user.is_active ? [] : [tr('builder.defaults.inactive')]),
              ].join(' · ')}
              label={tr('builder.defaults.choose', { name: user.name })}
              current={user.default_panel}
              published={published}
              options={options}
              busy={pending.has(user.id)}
              onChoose={id => choose(user.id, user.name, id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function DefaultRow({
  title,
  meta,
  label,
  current,
  published,
  options,
  busy,
  onChoose,
}: {
  title: string;
  meta: string;
  label: string;
  /** The panel URL path this row's default names now. */
  current: string | null;
  published: OHomeMyDocument;
  options: Choice[];
  busy: boolean;
  onChoose: (dashboardId: string | null) => void;
}) {
  const target = targetOf(current, published);
  // '' is no default; `d:` a Dashboard by id; `o:` another panel, which can
  // only be shown, since HA's own pickers are the place to choose those.
  const value = target.kind === 'none' ? '' : target.kind === 'dashboard' ? `d:${target.dashboard.id}` : `o:${target.urlPath}`;

  return (
    <li className='b-row'>
      <div className='b-row-main'>
        <div className='b-row-text'>
          <span className='b-row-title' dir='auto'>
            {title}
          </span>
          {meta && <span className='b-meta'>{meta}</span>}
        </div>
        <select
          className='b-input b-defaults-select'
          aria-label={label}
          value={value}
          disabled={busy}
          onChange={e => {
            const v = e.currentTarget.value;
            if (v === '') onChoose(null);
            else if (v.startsWith('d:')) onChoose(v.slice(2));
          }}
        >
          <option value=''>{tr('builder.defaults.haDefault')}</option>
          {options.map(({ dashboard, published }) => (
            <option key={dashboard.id} value={`d:${dashboard.id}`} disabled={!published}>
              {published ? dashboard.name : tr('builder.defaults.publishFirst', { name: dashboard.name })}
            </option>
          ))}
          {target.kind === 'other' && (
            <option value={value} disabled>
              {tr('builder.defaults.other', { urlPath: target.urlPath })}
            </option>
          )}
        </select>
      </div>
    </li>
  );
}
