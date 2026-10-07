/**
 * Laying out one Dashboard of the Draft (#56): its Pages, a palette of every
 * Widget kind, the preview to drag them on, and beside it the selected
 * Widget's settings, the Page's and the Dashboard's.
 *
 * Every edit goes into the Draft through `edit`, as a function of the
 * Dashboard (`layout.ts`, `pages.ts`), so nothing here decides what is
 * valid; it only chooses which edit to make.
 */
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Dashboard, Widget } from '../document/types';
import { viewerDirection } from '../i18n';
import { widgetSchemas } from '../widgets/registry';
import type { Ask } from './Builder';
import { DashboardSettings } from './DashboardSettings';
import { randomId } from './draft';
import { fromId } from './dashboardStrings';
import { Inspector } from './Inspector';
import { newWidget, sizeFor } from './inspector';
import { addWidget, canPlace, deleteWidget, freeSpot, gridOf, placeWidget, placedOnGrid, updateWidget, type Box } from './layout';
import { addPage } from './pages';
import { PageSettings } from './PageSettings';
import { Preview, type Ghost, type PreviewHandle } from './Preview';
import { strings } from './strings';

const t = strings.dashboard;

type Tab = 'widget' | 'page' | 'dashboard';

/** Pixels a pointer must travel from a palette item before it is a drag, not a tap. */
const DRAG_SLOP = 6;

export function DashboardScreen({
  dashboard,
  edit,
  ask,
  disabled,
  onClose,
}: {
  dashboard: Dashboard;
  edit: (f: (d: Dashboard) => Dashboard) => void;
  ask: Ask;
  disabled: boolean;
  onClose: () => void;
}) {
  const [pageId, setPageId] = useState(dashboard.home_page);
  const page = dashboard.pages.find(p => p.id === pageId) ?? dashboard.pages.find(p => p.id === dashboard.home_page) ?? dashboard.pages[0];
  const [selected, setSelected] = useState<string | null>(null);
  // A Widget deleted, or on another Page, is no longer selected.
  const widget = page.widgets.find(w => w.id === selected) ?? null;
  const [end, setEnd] = useState<'min' | 'max'>('max');
  const screen = dashboard.settings.supported_range[end];
  const [notFitting, setNotFitting] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('page');
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [full, setFull] = useState(false);
  const preview = useRef<PreviewHandle | null>(null);
  const grid = gridOf(page, dashboard.settings.overflow);

  const change = (f: (d: Dashboard) => Dashboard) => {
    if (!disabled) edit(f);
  };

  const select = (id: string | null) => {
    setSelected(id);
    if (id !== null) setTab('widget');
  };

  const openPage = (id: string) => {
    setPageId(id);
    setSelected(null);
    setFull(false);
  };

  /** A new Widget of `kind`, at `box` or the first free place, selected. */
  const add = (kind: string, box?: Box) => {
    const schema = widgetSchemas().find(s => s.kind === kind);
    const place = box ?? freeSpot(page.widgets, grid, sizeFor(kind));
    if (!schema || !place) {
      setFull(true);
      return;
    }
    setFull(false);
    const id = randomId();
    change(d => addWidget(d, page.id, newWidget(schema, id, place)));
    select(id);
  };

  /** A press on a palette item: dragged onto the preview, it lands under the pointer; tapped, it is added. */
  const dragged = useRef(false);
  const pressPalette = (kind: string) => (e: ReactPointerEvent) => {
    if (e.button !== 0 || disabled) return;
    // No text selection while dragging across the Builder.
    e.preventDefault();
    dragged.current = false;
    const start = { x: e.clientX, y: e.clientY };
    let last: Ghost | null = null;
    const boxAt = (x: number, y: number) => {
      const cell = preview.current?.cellAt(x, y);
      return cell ? placedOnGrid({ ...cell, ...sizeFor(kind) }, grid) : null;
    };
    const move = (ev: PointerEvent) => {
      if (!dragged.current && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < DRAG_SLOP) return;
      dragged.current = true;
      const box = boxAt(ev.clientX, ev.clientY);
      last = box && { box, valid: canPlace(box, page.widgets, grid) };
      setGhost(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setGhost(null);
      if (dragged.current && last?.valid) add(kind, last.box);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const kinds = widgetSchemas()
    .map(s => ({ kind: s.kind, name: t.kinds[s.kind] ?? fromId(s.kind) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className='b-dashboard-screen' aria-label={t.editing(dashboard.name)}>
      <div className='b-dashboard-screen-bar'>
        <button type='button' className='b-button' onClick={onClose}>
          {viewerDirection() === 'rtl' ? '→' : '←'} {t.back}
        </button>
        <h2 className='b-dashboard-screen-title'>{dashboard.name}</h2>
        <div className='b-pages' role='tablist' aria-label={t.pages.label}>
          {dashboard.pages.map(p => (
            <button
              key={p.id}
              type='button'
              role='tab'
              className='b-page-tab'
              aria-selected={p.id === page.id}
              onClick={() => openPage(p.id)}
            >
              {p.popup !== null ? t.pages.popup(p.popup) : p.name}
              {p.id === dashboard.home_page && <span className='b-chip'>{t.pages.home}</span>}
            </button>
          ))}
          <button
            type='button'
            className='b-button'
            disabled={disabled}
            onClick={() => {
              const id = randomId();
              const name = t.newPageName(dashboard.pages.length + 1);
              change(d => addPage(d, { id, name, grid: page.grid }));
              openPage(id);
              setTab('page');
            }}
          >
            + {t.pages.add}
          </button>
        </div>
      </div>

      <div className='b-dashboard-screen-body'>
        <aside className='b-palette' aria-label={t.palette.label}>
          <h3 className='b-panel-title'>{t.palette.label}</h3>
          <p className='b-meta'>{t.palette.hint}</p>
          {full && (
            <p className='b-note' data-tone='alert' role='status'>
              {t.palette.full}
            </p>
          )}
          <ul className='b-palette-list'>
            {kinds.map(k => (
              <li key={k.kind}>
                <button
                  type='button'
                  className='b-palette-item'
                  data-kind={k.kind}
                  disabled={disabled}
                  onPointerDown={pressPalette(k.kind)}
                  onClick={() => {
                    if (!dragged.current) add(k.kind);
                    dragged.current = false;
                  }}
                >
                  {k.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className='b-canvas'>
          <div className='b-canvas-bar'>
            <span className='b-label'>{t.size.label}</span>
            <div className='b-segmented' role='radiogroup' aria-label={t.size.label}>
              {(['min', 'max'] as const).map(e => (
                <button key={e} type='button' role='radio' aria-checked={end === e} onClick={() => setEnd(e)}>
                  {e === 'min' ? t.size.smallest : t.size.largest} ·{' '}
                  {t.size.dims(dashboard.settings.supported_range[e].width, dashboard.settings.supported_range[e].height)}
                </button>
              ))}
            </div>
            <span className='b-fit-summary' data-fits={notFitting.length === 0} role='status' title={t.size.fitRule}>
              {notFitting.length === 0
                ? t.size.allFit(screen.width, screen.height)
                : t.size.notFitting(notFitting.length, screen.width, screen.height)}
            </span>
          </div>
          <Preview
            dashboard={dashboard}
            page={page}
            screen={screen}
            selected={widget?.id ?? null}
            onSelect={select}
            onPlace={(id, box) => change(d => placeWidget(d, page.id, id, box))}
            onDelete={id => change(d => deleteWidget(d, page.id, id))}
            onOpenPage={openPage}
            onFit={setNotFitting}
            ghost={ghost}
            handle={preview}
          />
          <p className='b-meta'>{t.preview.rule}</p>
        </div>

        <aside className='b-side'>
          <div className='b-segmented b-side-tabs' role='tablist'>
            {(['widget', 'page', 'dashboard'] as const).map(k => (
              <button key={k} type='button' role='tab' aria-selected={tab === k} onClick={() => setTab(k)}>
                {t.tabs[k]}
              </button>
            ))}
          </div>
          {tab === 'widget' &&
            (widget ? (
              <Inspector
                key={widget.id}
                dashboard={dashboard}
                page={page}
                widget={widget}
                screen={screen}
                fits={!notFitting.includes(widget.id)}
                onChange={(patch: Partial<Omit<Widget, 'id'>>) => change(d => updateWidget(d, page.id, widget.id, patch))}
                onDelete={() => change(d => deleteWidget(d, page.id, widget.id))}
              />
            ) : (
              <p className='b-empty'>{t.widget.none}</p>
            ))}
          {tab === 'page' && <PageSettings dashboard={dashboard} page={page} edit={change} ask={ask} />}
          {tab === 'dashboard' && <DashboardSettings dashboard={dashboard} edit={change} />}
        </aside>
      </div>
    </section>
  );
}
