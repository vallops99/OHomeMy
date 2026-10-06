/**
 * The Dashboard's own settings (#56): whether it is in the sidebar, whether
 * its Pages fit or scroll, the supported range, the idle return, the back
 * gesture, its Theme and mode, and its Navbar. Every control offers only
 * what `pages.ts` accepts.
 */
import { EDGES, MODES, OVERFLOWS, type Dashboard, type Size } from '../document/types';
import { THEMES } from '../theme/themes';
import { iconChoices } from '../ui/iconMap';
import { randomId } from './draft';
import { Field, IconPicker, NumberInput, Picker, Switch } from './fields';
import {
  addNavbarItem,
  canFit,
  moveNavbarItem,
  ordinaryPages,
  removeNavbarItem,
  setNavbar,
  setNavbarFields,
  setRangeEnd,
  setSettings,
  updateNavbarItem,
} from './pages';
import { strings } from './strings';

const t = strings.editor.dashboard;
const n = strings.editor.navbar;
const ICON_OPTIONS = iconChoices().map(name => ({ value: name, label: name.replace(/^mdi:/, '') }));

type Edit = (f: (d: Dashboard) => Dashboard) => void;

export function DashboardSettings({ dashboard, edit }: { dashboard: Dashboard; edit: Edit }) {
  const s = dashboard.settings;
  const fitOk = canFit(dashboard);

  return (
    <div className='b-panel-body'>
      <Switch checked={dashboard.show_in_sidebar} label={t.sidebar} onChange={on => edit(d => ({ ...d, show_in_sidebar: on }))} />

      <Field label={t.overflow} hint={!fitOk && s.overflow === 'scroll' && t.cannotFit}>
        {id => (
          <Picker
            id={id}
            name='overflow'
            value={s.overflow}
            options={OVERFLOWS.filter(o => o === s.overflow || o === 'scroll' || fitOk).map(o => ({ value: o, label: t.overflows[o] }))}
            onChange={v => v && edit(d => setSettings(d, { overflow: v as Dashboard['settings']['overflow'] }))}
          />
        )}
      </Field>

      <fieldset className='b-fieldset'>
        <legend className='b-label'>{t.range}</legend>
        <RangeEnd label={t.smallest} name='min' size={s.supported_range.min} onChange={size => edit(d => setRangeEnd(d, 'min', size))} />
        <RangeEnd label={t.largest} name='max' size={s.supported_range.max} onChange={size => edit(d => setRangeEnd(d, 'max', size))} />
        <span className='b-meta'>{t.rangeHint}</span>
      </fieldset>

      <Switch
        checked={s.idle_return !== null}
        label={t.idle}
        onChange={on => edit(d => setSettings(d, { idle_return: on ? 120 : null }))}
      />
      {s.idle_return !== null && (
        <Field label={t.idleSeconds}>
          {id => (
            <NumberInput
              id={id}
              name='idle_return'
              value={s.idle_return!}
              min={1}
              max={86400}
              onChange={sec => edit(d => setSettings(d, { idle_return: sec }))}
            />
          )}
        </Field>
      )}

      <Switch checked={s.back_history} label={t.back} onChange={on => edit(d => setSettings(d, { back_history: on }))} />

      <div className='b-pair'>
        <Field label={t.theme}>
          {id => (
            <Picker
              id={id}
              name='theme'
              value={s.theme.name}
              options={Object.keys(THEMES).map(k => ({ value: k, label: t.themes[k] ?? k }))}
              onChange={v => v && edit(d => setSettings(d, { theme: { ...d.settings.theme, name: v } }))}
            />
          )}
        </Field>
        <Field label={t.mode}>
          {id => (
            <Picker
              id={id}
              name='mode'
              value={s.theme.mode}
              options={MODES.map(m => ({ value: m, label: t.modes[m] }))}
              onChange={v => v && edit(d => setSettings(d, { theme: { ...d.settings.theme, mode: v as (typeof MODES)[number] } }))}
            />
          )}
        </Field>
      </div>

      <NavbarSettings dashboard={dashboard} edit={edit} />
    </div>
  );
}

function RangeEnd({ label, name, size, onChange }: { label: string; name: string; size: Size; onChange: (s: Size) => void }) {
  return (
    <div className='b-pair'>
      <Field label={`${label} · ${t.width}`}>
        {id => (
          <NumberInput
            id={id}
            name={`${name}-width`}
            value={size.width}
            min={1}
            max={10000}
            onChange={width => onChange({ ...size, width })}
          />
        )}
      </Field>
      <Field label={`${label} · ${t.height}`}>
        {id => (
          <NumberInput
            id={id}
            name={`${name}-height`}
            value={size.height}
            min={1}
            max={10000}
            onChange={height => onChange({ ...size, height })}
          />
        )}
      </Field>
    </div>
  );
}

function NavbarSettings({ dashboard, edit }: { dashboard: Dashboard; edit: Edit }) {
  const navbar = dashboard.navbar;
  const pages = ordinaryPages(dashboard).map(p => ({ value: p.id, label: p.name }));

  return (
    <section className='b-subsection' aria-label={n.title}>
      <h4 className='b-subhead'>{n.title}</h4>
      <Switch
        checked={navbar !== null}
        label={n.on}
        onChange={on => {
          const itemId = randomId();
          edit(d => setNavbar(d, on, itemId));
        }}
      />
      {navbar && (
        <>
          <Field label={n.edge}>
            {id => (
              <Picker
                id={id}
                name='edge'
                value={navbar.edge}
                options={EDGES.map(e => ({ value: e, label: n.edges[e] }))}
                onChange={v => v && edit(d => setNavbarFields(d, { edge: v as (typeof EDGES)[number] }))}
              />
            )}
          </Field>
          <Switch checked={navbar.tabs} label={n.tabs} onChange={tabs => edit(d => setNavbarFields(d, { tabs }))} />

          <span className='b-label'>{n.items}</span>
          <ol className='b-ordered-list'>
            {navbar.items.map((item, i) => (
              <li key={item.id} className='b-nav-item'>
                <Picker
                  name={`nav-page-${i}`}
                  value={item.page}
                  options={pages}
                  onChange={v => v && edit(d => updateNavbarItem(d, item.id, { page: v }))}
                />
                <IconPicker
                  name={`nav-icon-${i}`}
                  value={item.icon}
                  options={
                    ICON_OPTIONS.some(o => o.value === item.icon) ? ICON_OPTIONS : [{ value: item.icon, label: item.icon }, ...ICON_OPTIONS]
                  }
                  onChange={v => v && edit(d => updateNavbarItem(d, item.id, { icon: v }))}
                />
                <span className='b-actions'>
                  <button
                    type='button'
                    className='b-button b-icon'
                    aria-label={strings.editor.field.up}
                    disabled={i === 0}
                    onClick={() => edit(d => moveNavbarItem(d, item.id, -1))}
                  >
                    ↑
                  </button>
                  <button
                    type='button'
                    className='b-button b-icon'
                    aria-label={strings.editor.field.down}
                    disabled={i === navbar.items.length - 1}
                    onClick={() => edit(d => moveNavbarItem(d, item.id, 1))}
                  >
                    ↓
                  </button>
                  <button
                    type='button'
                    className='b-button b-icon'
                    aria-label={strings.editor.field.remove}
                    onClick={() => edit(d => removeNavbarItem(d, item.id))}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <div className='b-actions'>
            <button
              type='button'
              className='b-button'
              onClick={() => {
                const id = randomId();
                edit(d => {
                  // The first ordinary Page with no item yet, else the Home Page.
                  const used = new Set(d.navbar?.items.map(i => i.page));
                  const page = ordinaryPages(d).find(p => !used.has(p.id))?.id ?? d.home_page;
                  return addNavbarItem(d, { id, page, icon: 'mdi:dots-grid' });
                });
              }}
            >
              {n.add}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
