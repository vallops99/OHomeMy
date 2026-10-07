/**
 * The Page being edited (#56): its name, whether it is the Home Page, its
 * grid, its place in the list, and removing it. Every control offers only
 * what `pages.ts` accepts: the grid cannot shrink past its Widgets, and the
 * Home Page cannot be removed.
 */
import type { Dashboard, Page } from '../document/types';
import { tr } from '../i18n';
import type { Ask } from './Builder';
import { Field, NumberInput } from './fields';
import { minimumGrid } from './layout';
import { GRID_MAX, movePage, removePage, renamePage, setGrid, setHomePage } from './pages';

export function PageSettings({
  dashboard,
  page,
  edit,
  ask,
}: {
  dashboard: Dashboard;
  page: Page;
  edit: (f: (d: Dashboard) => Dashboard) => void;
  ask: Ask;
}) {
  const isHome = dashboard.home_page === page.id;
  const least = minimumGrid(page);
  const fit = dashboard.settings.overflow === 'fit';
  const index = dashboard.pages.indexOf(page);

  return (
    <div className='b-panel-body'>
      <Field label={tr('builder.dashboard.page.name')}>
        {id => <PageName key={page.id} id={id} name={page.name} onChange={name => edit(d => renamePage(d, page.id, name))} />}
      </Field>

      {page.popup !== null ? (
        <p className='b-meta'>{tr('builder.dashboard.page.popupNote')}</p>
      ) : isHome ? (
        <p className='b-meta'>{tr('builder.dashboard.page.isHome')}</p>
      ) : (
        <div className='b-actions'>
          <button type='button' className='b-button' onClick={() => edit(d => setHomePage(d, page.id))}>
            {tr('builder.dashboard.page.makeHome')}
          </button>
        </div>
      )}

      <div className='b-pair'>
        <Field label={tr('builder.dashboard.page.columns')}>
          {id => (
            <NumberInput
              id={id}
              name='columns'
              value={page.grid.columns}
              min={least.columns}
              max={GRID_MAX}
              onChange={columns => edit(d => setGrid(d, page.id, { ...page.grid, columns }))}
            />
          )}
        </Field>
        <Field label={tr('builder.dashboard.page.rows')}>
          {id => (
            <NumberInput
              id={id}
              name='rows'
              value={page.grid.rows}
              min={fit ? least.rows : 1}
              max={GRID_MAX}
              onChange={rows => edit(d => setGrid(d, page.id, { ...page.grid, rows }))}
            />
          )}
        </Field>
      </div>
      {page.widgets.length > 0 && (
        <p className='b-meta'>{tr('builder.dashboard.page.gridHint', { columns: least.columns, rows: fit ? least.rows : 1 })}</p>
      )}

      <div className='b-actions'>
        <button type='button' className='b-button' disabled={index <= 0} onClick={() => edit(d => movePage(d, page.id, -1))}>
          {tr('builder.dashboard.page.moveEarlier')}
        </button>
        <button
          type='button'
          className='b-button'
          disabled={index >= dashboard.pages.length - 1}
          onClick={() => edit(d => movePage(d, page.id, 1))}
        >
          {tr('builder.dashboard.page.moveLater')}
        </button>
        <button
          type='button'
          className='b-button'
          disabled={isHome || dashboard.pages.length <= 1}
          onClick={() =>
            ask({
              message: tr('builder.dashboard.page.removeConfirm', { name: page.name }),
              confirmLabel: tr('builder.dashboard.page.remove'),
              onConfirm: () => edit(d => removePage(d, page.id)),
            })
          }
        >
          {tr('builder.dashboard.page.remove')}
        </button>
      </div>
      {isHome && <p className='b-meta'>{tr('builder.dashboard.page.homeCannotGo')}</p>}
    </div>
  );
}

/** The name, committed as typed unless blank, which the server refuses. */
function PageName({ id, name, onChange }: { id: string; name: string; onChange: (name: string) => void }) {
  return (
    <input
      className='b-input'
      id={id}
      name='page-name'
      defaultValue={name}
      onChange={e => e.target.value.trim() !== '' && onChange(e.target.value)}
      onBlur={e => {
        if (e.target.value.trim() === '') e.target.value = name;
      }}
    />
  );
}
