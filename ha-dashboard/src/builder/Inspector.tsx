/**
 * The selected Widget's settings (#56), generated from its kind's schema
 * (`inspector.ts`): its form (Variant), its title, the Page a tap opens, and
 * one control per setting, each offering only what the schema accepts and
 * the house has.
 */
import { useMemo } from 'react';
import { validateWidget } from '../document/schema';
import type { Dashboard, Page, Size, Widget } from '../document/types';
import { useAreas, useEntities, useHouse } from '../ha';
import { iconChoices } from '../ui/iconMap';
import { widgetKind } from '../widgets/registry';
import { fromId } from './dashboardStrings';
import { Field, IconPicker, NumberInput, OrderedList, Picker, Switch } from './fields';
import { controlsFor, withSetting, type Control, type HouseLists } from './inspector';
import { gridOf } from './layout';
import { ordinaryPages } from './pages';
import { strings } from './strings';

const t = strings.dashboard;
const ICONS = iconChoices();

export function Inspector({
  dashboard,
  page,
  widget,
  screen,
  fits,
  onChange,
  onDelete,
}: {
  dashboard: Dashboard;
  page: Page;
  widget: Widget;
  screen: Size;
  fits: boolean;
  onChange: (patch: Partial<Omit<Widget, 'id'>>) => void;
  onDelete: () => void;
}) {
  const lists = useHouseLists();
  const house = useHouse();
  const kind = widgetKind(widget.kind);
  const schema = kind?.schema;
  const name = t.kinds[widget.kind] ?? fromId(widget.kind);

  const valid = validateWidget(widget, schema, { grid: gridOf(page, dashboard.settings.overflow), house });
  const problem = !valid.ok ? valid.reason : kind?.tap === 'page' && widget.on_tap === null ? t.widget.noPage : null;
  const pages = ordinaryPages(dashboard).map(p => ({ value: p.id, label: p.name }));

  return (
    <div className='b-inspector' aria-label={name}>
      <div className='b-section-head'>
        <h3 className='b-panel-title'>{name}</h3>
        <button type='button' className='b-button' onClick={onDelete}>
          {t.widget.delete}
        </button>
      </div>
      <p className='b-meta'>{t.widget.place(widget.x, widget.y, widget.w, widget.h)}</p>
      {problem !== null && (
        <p className='b-note' data-tone='alert' role='status'>
          {t.widget.notShown(problem)}
        </p>
      )}
      {problem === null && !fits && (
        <p className='b-note' data-tone='alert' role='status'>
          {t.widget.notFitting(screen.width, screen.height)}
        </p>
      )}

      {schema && schema.variants.length > 1 && (
        <Field label={t.widget.variant}>
          {() => (
            <div className='b-segmented' role='radiogroup' aria-label={t.widget.variant}>
              {schema.variants.map(v => (
                <button key={v} type='button' role='radio' aria-checked={widget.variant === v} onClick={() => onChange({ variant: v })}>
                  {t.widget.variants[v] ?? v}
                </button>
              ))}
            </div>
          )}
        </Field>
      )}

      {schema?.titled && (
        <Field label={t.widget.title} hint={widget.title !== null && t.widget.titleHint}>
          {id => (
            <div className='b-title'>
              <div className='b-segmented' role='radiogroup' aria-label={t.widget.title}>
                <button type='button' role='radio' aria-checked={widget.title === null} onClick={() => onChange({ title: null })}>
                  {t.widget.titleDefault}
                </button>
                <button
                  type='button'
                  role='radio'
                  aria-checked={widget.title !== null}
                  onClick={() => widget.title === null && onChange({ title: '' })}
                >
                  {t.widget.titleOwn}
                </button>
              </div>
              {widget.title !== null && (
                <div className='b-row-inline'>
                  <input
                    className='b-input'
                    id={id}
                    name='title'
                    value={widget.title}
                    maxLength={200}
                    onChange={e => onChange({ title: e.target.value })}
                  />
                  <button type='button' className='b-button' onClick={() => onChange({ title: null })}>
                    {t.widget.titleReset}
                  </button>
                </div>
              )}
            </div>
          )}
        </Field>
      )}

      <Field label={t.widget.onTap}>
        {id => (
          <Picker
            id={id}
            name='on_tap'
            value={widget.on_tap}
            options={pages}
            none={kind?.tap === 'page' ? undefined : t.widget.onTapNone}
            onChange={v => onChange({ on_tap: v })}
          />
        )}
      </Field>

      {schema && Object.keys(schema.settings).length > 0 && (
        <>
          <h4 className='b-subhead'>{t.widget.settings}</h4>
          {controlsFor(schema, widget.settings, lists, ICONS).map(c => (
            <SettingControl key={c.key} control={c} onChange={v => onChange({ settings: withSetting(widget.settings, c.key, v) })} />
          ))}
        </>
      )}
    </div>
  );
}

function SettingControl({ control: c, onChange }: { control: Control; onChange: (value: unknown) => void }) {
  const label = t.settingNames[c.key] ?? fromId(c.key);
  return (
    <Field label={label}>
      {id => {
        switch (c.type) {
          case 'entity':
          case 'area':
            return (
              <Picker
                id={id}
                name={c.key}
                value={c.value}
                options={c.options}
                none={c.optional ? t.field.none : undefined}
                onChange={onChange}
              />
            );
          case 'icon':
            return (
              <IconPicker
                id={id}
                name={c.key}
                value={c.value}
                options={c.options}
                none={c.optional ? t.field.none : undefined}
                onChange={onChange}
              />
            );
          case 'entities':
          case 'areas':
            return <OrderedList id={id} chosen={c.chosen} options={c.options} min={c.min} onChange={onChange} />;
          case 'boolean':
            return <Switch id={id} checked={c.value} label={label} onChange={onChange} />;
          case 'choice':
            return <Picker id={id} name={c.key} value={c.value} options={c.options} onChange={v => v !== null && onChange(v)} />;
          case 'number':
            return <NumberInput id={id} name={c.key} value={c.value} min={c.min} max={c.max} step={c.step} onChange={onChange} />;
          case 'text':
            return (
              <input
                className='b-input'
                id={id}
                name={c.key}
                value={c.value ?? ''}
                maxLength={c.maxLength}
                onChange={e => onChange(e.target.value === '' && c.optional ? null : e.target.value)}
              />
            );
        }
      }}
    </Field>
  );
}

/** The house as the pickers list it: every entity the renderer could show, and every Area. */
function useHouseLists(): HouseLists {
  const entities = useEntities();
  const areas = useAreas();
  return useMemo(
    () => ({
      entities: [...entities.values()].map(e => ({ id: e.id, name: e.name, domain: e.domain, areaId: e.areaId })),
      areas: areas.map(a => ({ id: a.id, name: a.name })),
    }),
    [entities, areas]
  );
}
