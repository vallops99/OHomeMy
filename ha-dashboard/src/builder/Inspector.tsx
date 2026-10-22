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
import { tr } from '../i18n';
import { iconChoices } from '../ui/iconMap';
import { widgetKind } from '../widgets/registry';
import { Field, IconPicker, NumberInput, OrderedList, Picker, Switch } from './fields';
import {
  controlsFor,
  updateAreaTap,
  withAreaIds,
  withMemberIds,
  withSetting,
  type Control,
  type HouseLists,
  type Option,
} from './inspector';
import { gridOf } from './layout';
import { ordinaryPages } from './pages';
import { kindName, settingName } from './words';

const ICONS = iconChoices();

export function Inspector({
  dashboard,
  page,
  widget,
  screen,
  fits,
  onChange,
  onDelete,
  onSelectMember,
}: {
  dashboard: Dashboard;
  page: Page;
  widget: Widget;
  screen: Size;
  fits: boolean;
  onChange: (patch: Partial<Omit<Widget, 'id'>>) => void;
  onDelete: () => void;
  /** A Group's Member picked from its list, to edit it (#73). */
  onSelectMember: (entity: string) => void;
}) {
  const lists = useHouseLists();
  const house = useHouse();
  const kind = widgetKind(widget.kind);
  const schema = kind?.schema;
  const name = kindName(widget.kind);

  const valid = validateWidget(widget, schema, { grid: gridOf(page, dashboard.settings.overflow), house });
  const problem = !valid.ok ? valid.reason : kind?.tap === 'page' && widget.on_tap === null ? tr('builder.dashboard.widget.noPage') : null;
  const pages = ordinaryPages(dashboard).map(p => ({ value: p.id, label: p.name }));

  return (
    <div className='b-inspector' aria-label={name}>
      <div className='b-section-head'>
        <h3 className='b-panel-title'>{name}</h3>
        <button type='button' className='b-button' onClick={onDelete}>
          {tr('builder.dashboard.widget.delete')}
        </button>
      </div>
      <p className='b-meta'>
        {tr('builder.dashboard.widget.place', { column: widget.x + 1, row: widget.y + 1, w: widget.w, h: widget.h })}
      </p>
      {problem !== null && (
        <p className='b-note' data-tone='alert' role='status'>
          {tr('builder.dashboard.widget.notShown', { reason: problem })}
        </p>
      )}
      {problem === null && !fits && (
        <p className='b-note' data-tone='alert' role='status'>
          {tr('builder.dashboard.widget.notFitting', { width: screen.width, height: screen.height })}
        </p>
      )}

      {schema && schema.variants.length > 1 && (
        <Field label={tr('builder.dashboard.widget.variant')}>
          {() => (
            <div className='b-segmented' role='radiogroup' aria-label={tr('builder.dashboard.widget.variant')}>
              {schema.variants.map(v => (
                <button key={v} type='button' role='radio' aria-checked={widget.variant === v} onClick={() => onChange({ variant: v })}>
                  {tr(`builder.dashboard.widget.variant.${v}`)}
                </button>
              ))}
            </div>
          )}
        </Field>
      )}

      {schema?.titled && (
        <Field label={tr('builder.dashboard.widget.title')} hint={widget.title !== null && tr('builder.dashboard.widget.titleHint')}>
          {id => (
            <div className='b-title'>
              <div className='b-segmented' role='radiogroup' aria-label={tr('builder.dashboard.widget.title')}>
                <button type='button' role='radio' aria-checked={widget.title === null} onClick={() => onChange({ title: null })}>
                  {tr('builder.dashboard.widget.titleDefault')}
                </button>
                <button
                  type='button'
                  role='radio'
                  aria-checked={widget.title !== null}
                  onClick={() => widget.title === null && onChange({ title: '' })}
                >
                  {tr('builder.dashboard.widget.titleOwn')}
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
                    {tr('builder.dashboard.widget.titleReset')}
                  </button>
                </div>
              )}
            </div>
          )}
        </Field>
      )}

      <Field label={tr('builder.dashboard.widget.onTap')}>
        {id => (
          <Picker
            id={id}
            name='on_tap'
            value={widget.on_tap}
            options={pages}
            none={kind?.tap === 'page' ? undefined : tr('builder.dashboard.widget.onTapNone')}
            onChange={v => onChange({ on_tap: v })}
          />
        )}
      </Field>

      {schema && Object.keys(schema.settings).length > 0 && (
        <>
          <h4 className='b-subhead'>{tr('builder.dashboard.widget.settings')}</h4>
          {controlsFor(schema, widget.settings, lists, ICONS).map(c => (
            <SettingControl
              key={c.key}
              control={c}
              pages={pages}
              onChange={v => onChange({ settings: withSetting(widget.settings, c.key, v) })}
              onSelectMember={onSelectMember}
            />
          ))}
        </>
      )}
    </div>
  );
}

function SettingControl({
  control: c,
  pages,
  onChange,
  onSelectMember,
}: {
  control: Control;
  /** The ordinary Pages a Room Grid's Area may open (#75). */
  pages: Option[];
  onChange: (value: unknown) => void;
  onSelectMember: (entity: string) => void;
}) {
  const label = settingName(c.key);
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
                none={c.optional ? tr('builder.dashboard.field.none') : undefined}
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
                none={c.optional ? tr('builder.dashboard.field.none') : undefined}
                onChange={onChange}
              />
            );
          case 'entities':
            return <OrderedList id={id} chosen={c.chosen} options={c.options} min={c.min} onChange={onChange} />;
          case 'areas':
            // Each Area a Member with its own tap (#75), kept as it is
            // reordered, and set from the same picker as a Widget's.
            return (
              <>
                <OrderedList
                  id={id}
                  chosen={c.chosen}
                  options={c.options}
                  min={c.min}
                  onChange={ids => onChange(withAreaIds(c.value, ids))}
                />
                {c.value.map((m, i) => (
                  <Field key={m.area} label={tr('builder.dashboard.area.onTap', { area: c.chosen[i].label })}>
                    {tapId => (
                      <Picker
                        id={tapId}
                        name={`${c.key}-${m.area}-on_tap`}
                        value={m.on_tap}
                        options={pages}
                        none={tr('builder.dashboard.widget.onTapNone')}
                        onChange={v => onChange(updateAreaTap(c.value, m.area, v))}
                      />
                    )}
                  </Field>
                ))}
              </>
            );
          case 'members':
            // Every Member written in full, its own settings kept, as it is reordered.
            return (
              <OrderedList
                id={id}
                chosen={c.chosen}
                options={c.options}
                min={c.min}
                onChange={ids => onChange(withMemberIds(c.value, ids))}
                onSelect={onSelectMember}
              />
            );
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
