/**
 * The Draft's Dashboards: list, create, rename, duplicate, delete. Every
 * change goes into the Draft only; nobody sees it until it is Published.
 */
import { useId, useState } from 'react';
import type { Dashboard, OHomeMyDocument } from '../document/types';
import type { Ask } from './Builder';
import {
  addDashboard,
  dashboardChanges,
  deleteDashboard,
  duplicateDashboard,
  nameProblem,
  newDashboard,
  randomId,
  renameDashboard,
} from './draft';
import { slugify, slugProblem, uniqueSlug } from './slug';
import { strings } from './strings';

type Edit = (edit: (draft: OHomeMyDocument) => OHomeMyDocument) => void;

/** Which form is open: one at a time. */
type Form = { mode: 'create' } | { mode: 'duplicate'; dashboard: Dashboard } | { mode: 'rename'; dashboard: Dashboard };

export function DashboardList({
  base,
  draft,
  disabled,
  edit,
  ask,
  onEdit,
}: {
  base: OHomeMyDocument;
  draft: OHomeMyDocument;
  disabled: boolean;
  edit: Edit;
  ask: Ask;
  /** Opens the Dashboard's layout in the editor (#56). */
  onEdit: (id: string) => void;
}) {
  const [form, setForm] = useState<Form | null>(null);
  const { changes, deleted } = dashboardChanges(base, draft);
  const published = new Set(base.dashboards.map(d => d.id));
  const slugs = draft.dashboards.map(d => d.slug);

  const formFor = (dashboard: Dashboard) => form && form.mode !== 'create' && form.dashboard.id === dashboard.id;

  return (
    <section className='b-section' aria-labelledby='b-dashboards'>
      <div className='b-section-head'>
        <h2 id='b-dashboards'>{strings.dashboards.title}</h2>
        <button className='b-button' disabled={disabled || !!form} onClick={() => setForm({ mode: 'create' })}>
          {strings.dashboards.create}
        </button>
      </div>

      {form?.mode === 'create' && (
        <DashboardForm
          title={strings.form.createTitle}
          initialName=''
          taken={slugs}
          onCancel={() => setForm(null)}
          onSubmit={fields => {
            edit(d => addDashboard(d, newDashboard(fields, strings.homePageName, randomId)));
            setForm(null);
          }}
        />
      )}

      {draft.dashboards.length === 0 && !form && <p className='b-empty'>{strings.dashboards.none}</p>}

      <ul className='b-list'>
        {draft.dashboards.map(dashboard => (
          <li key={dashboard.id} className='b-row'>
            <div className='b-row-main'>
              <div className='b-row-text'>
                <span className='b-row-title' dir='auto'>
                  {dashboard.name}
                </span>
                <span className='b-meta'>
                  {/* An address reads left to right in any language. */}
                  <bdi>{strings.form.url(dashboard.slug)}</bdi>
                  {[
                    '',
                    strings.dashboards.pages(dashboard.pages.length),
                    ...(dashboard.show_in_sidebar ? [] : [strings.dashboards.hidden]),
                  ].join(' · ')}
                </span>
              </div>
              {changes.has(dashboard.id) && (
                <span className='b-chip'>{changes.get(dashboard.id) === 'new' ? strings.dashboards.new : strings.dashboards.changed}</span>
              )}
              <div className='b-actions'>
                <button className='b-button b-primary' disabled={!!form} onClick={() => onEdit(dashboard.id)}>
                  {strings.editor.edit}
                </button>
                {published.has(dashboard.id) && (
                  <a className='b-button' href={strings.form.url(dashboard.slug)}>
                    {strings.dashboards.open}
                  </a>
                )}
                <button className='b-button' disabled={disabled || !!form} onClick={() => setForm({ mode: 'rename', dashboard })}>
                  {strings.dashboards.rename}
                </button>
                <button className='b-button' disabled={disabled || !!form} onClick={() => setForm({ mode: 'duplicate', dashboard })}>
                  {strings.dashboards.duplicate}
                </button>
                <button
                  className='b-button'
                  disabled={disabled || !!form}
                  onClick={() =>
                    ask({
                      message: strings.dashboards.deleteConfirm(dashboard.name),
                      confirmLabel: strings.dashboards.delete,
                      onConfirm: () => edit(d => deleteDashboard(d, dashboard.id)),
                    })
                  }
                >
                  {strings.dashboards.delete}
                </button>
              </div>
            </div>

            {formFor(dashboard) && form?.mode === 'rename' && (
              <DashboardForm
                title={strings.form.renameTitle}
                initialName={dashboard.name}
                onCancel={() => setForm(null)}
                onSubmit={({ name }) => {
                  edit(d => renameDashboard(d, dashboard.id, name));
                  setForm(null);
                }}
              />
            )}
            {formFor(dashboard) && form?.mode === 'duplicate' && (
              <DashboardForm
                title={strings.form.duplicateTitle(dashboard.name)}
                initialName={strings.dashboards.copyName(dashboard.name)}
                initialSlug={uniqueSlug(`${dashboard.slug}-copy`, slugs)}
                taken={slugs}
                onCancel={() => setForm(null)}
                onSubmit={fields => {
                  edit(d => duplicateDashboard(d, dashboard.id, fields, randomId).document);
                  setForm(null);
                }}
              />
            )}
          </li>
        ))}
      </ul>

      {deleted.length > 0 && <p className='b-meta'>{strings.dashboards.deleted(deleted.map(d => d.name))}</p>}
    </section>
  );
}

/**
 * A name, and for a new Dashboard its slug. The slug follows the name until
 * the admin types one of their own; a rename has none to choose (`taken`
 * absent), because a slug is fixed once the Dashboard exists.
 */
function DashboardForm({
  title,
  initialName,
  initialSlug,
  taken,
  onSubmit,
  onCancel,
}: {
  title: string;
  initialName: string;
  initialSlug?: string;
  taken?: string[];
  onSubmit: (fields: { name: string; slug: string }) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const choosesSlug = taken !== undefined;
  const [name, setName] = useState(initialName);
  const [ownSlug, setOwnSlug] = useState<string | null>(initialSlug ?? null);
  const slug = ownSlug ?? slugify(name);
  const [tried, setTried] = useState(false);

  const nameError = nameProblem(name) && strings.form.nameEmpty;
  const slugIssue = choosesSlug ? slugProblem(slug, taken) : null;
  const slugError = slugIssue && strings.form.slug_problem[slugIssue];

  return (
    <form
      className='b-form'
      aria-label={title}
      onSubmit={e => {
        e.preventDefault();
        setTried(true);
        if (!nameError && !slugError) onSubmit({ name, slug });
      }}
    >
      <h3>{title}</h3>
      <div className='b-field'>
        <label className='b-label' htmlFor={`${id}-name`}>
          {strings.form.name}
        </label>
        <input
          className='b-input'
          id={`${id}-name`}
          name='name'
          value={name}
          autoFocus
          aria-describedby={`${id}-name-error`}
          onChange={e => setName(e.target.value)}
        />
        <span className='b-error' id={`${id}-name-error`}>
          {tried && nameError}
        </span>
      </div>
      {choosesSlug && (
        <div className='b-field'>
          <label className='b-label' htmlFor={`${id}-slug`}>
            {strings.form.slug}
          </label>
          <input
            className='b-input'
            id={`${id}-slug`}
            name='slug'
            value={slug}
            spellCheck={false}
            autoCapitalize='off'
            aria-describedby={`${id}-slug-hint ${id}-slug-error`}
            onChange={e => setOwnSlug(e.target.value)}
          />
          <span className='b-meta' id={`${id}-slug-hint`}>
            <bdi>{strings.form.url(slug)}</bdi> · {strings.form.slugHint}
          </span>
          <span className='b-error' id={`${id}-slug-error`}>
            {(tried || (ownSlug !== null && ownSlug !== initialSlug)) && slugError}
          </span>
        </div>
      )}
      <div className='b-actions'>
        <button className='b-button b-primary' type='submit'>
          {choosesSlug ? strings.form.create : strings.form.save}
        </button>
        <button className='b-button' type='button' onClick={onCancel}>
          {strings.form.cancel}
        </button>
      </div>
    </form>
  );
}
