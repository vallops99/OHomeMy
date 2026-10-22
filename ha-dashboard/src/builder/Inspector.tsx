/**
 * The selected Widget's settings (#56), generated from its kind's schema
 * (`inspector.ts`): its form (Variant), its title, the Page a tap opens, and
 * one control per setting, each offering only what the schema accepts and
 * the house has.
 */
import { useState } from 'react';
import { validateWidget } from '../document/schema';
import type { Dashboard, Page, Size, Widget } from '../document/types';
import { useHouse } from '../ha';
import { tr } from '../i18n';
import { iconChoices } from '../ui/iconMap';
import { widgetKind } from '../widgets/registry';
import { Field, IconPicker, NumberInput, OrderedList, Picker, Switch } from './fields';
import {
  changeSetting,
  controlsFor,
  domainFilter,
  retiredLists,
  titleControl,
  withAreaIds,
  withMemberIds,
  withoutRetiredLists,
  type Control,
} from './inspector';
import { gridOf } from './layout';
import { ordinaryPages } from './pages';
import { useHouseLists } from './useHouseLists';
import { domainName, kindName, settingName } from './words';

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
  /** A Group's Member or a Room Grid's Area picked from its list, to edit it (#73, #78). */
  onSelectMember: (key: string) => void;
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
      {schema && retiredLists(schema, widget.settings).length > 0 && (
        <button type='button' className='b-button' onClick={() => onChange({ settings: withoutRetiredLists(schema, widget.settings) })}>
          {tr('builder.dashboard.widget.retiredLists')}
        </button>
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

      {schema && titleControl(schema) === 'default-or-own' && (
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

      {schema && titleControl(schema) === 'text' && (
        // A Group has no Default title (ADR-0017): only what is written here.
        <Field label={tr('builder.dashboard.widget.title')} hint={tr('builder.dashboard.widget.titleHint')}>
          {id => (
            <input
              className='b-input'
              id={id}
              name='title'
              value={widget.title ?? ''}
              maxLength={200}
              onChange={e => onChange({ title: e.target.value })}
            />
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
              // One edit, so one Undo step: an Area changed clears what was chosen in the old one.
              onChange={v => onChange({ settings: changeSetting(schema, widget.settings, c.key, v) })}
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
  onChange,
  onSelectMember,
}: {
  control: Control;
  onChange: (value: unknown) => void;
  onSelectMember: (key: string) => void;
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
            // Every Area written in full, its own choices kept, as it is reordered.
            return (
              <OrderedList
                id={id}
                chosen={c.chosen}
                options={c.options}
                min={c.min}
                onChange={ids => onChange(withAreaIds(c.value, ids))}
                onSelect={onSelectMember}
              />
            );
          case 'members':
            return <MemberList id={id} control={c} onChange={onChange} onSelect={onSelectMember} />;
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

/**
 * A Group's Members, added to from a picker narrowed by Domain (#76). The
 * Domain picked is Builder state: never the Draft, so never an Undo step.
 */
function MemberList({
  id,
  control,
  onChange,
  onSelect,
}: {
  id: string;
  control: Extract<Control, { type: 'members' }>;
  onChange: (value: unknown) => void;
  onSelect?: (entity: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const filter = domainFilter(control.options, picked);
  return (
    // Every Member written in full, its own settings kept, as it is reordered.
    <OrderedList
      id={id}
      chosen={control.chosen}
      options={filter.options}
      min={control.min}
      onChange={ids => onChange(withMemberIds(control.value, ids))}
      onSelect={onSelect}
      empty={tr('builder.dashboard.member.noneLeft')}
      filter={
        filter.domains.length > 0 && (
          <Picker
            className='b-domain-filter'
            label={tr('builder.dashboard.field.domain')}
            value={filter.picked}
            none={tr('builder.dashboard.field.allDomains')}
            options={filter.domains.map(d => ({ value: d, label: domainName(d) })).sort((a, b) => a.label.localeCompare(b.label))}
            onChange={setPicked}
          />
        )
      }
    />
  );
}
