/**
 * A selected Area's settings in a Room Grid (#78): its tile's tap, light and
 * temperature, each `null` while unset ("none"). It is the Member inspector
 * (`MemberInspector.tsx`) for the other kind of Member: the same breadcrumb
 * back to the grid, the same Remove, the same tap picker over the ordinary
 * Pages.
 *
 * The light and the temperature are chosen only among the entities in this
 * Area (ADR-0018, `tileOptions`). A chosen one no longer in it stays listed
 * and selected, marked, so opening the inspector never changes the Widget.
 * An Area Home Assistant no longer has stays selectable, and says so.
 */
import type { AreaMember } from '../document/schema';
import { TILE_LIGHT_DOMAINS, TILE_TEMPERATURE_DOMAINS } from '../document/schema';
import type { Dashboard, Widget } from '../document/types';
import { useAreas } from '../ha';
import { tr } from '../i18n';
import { Field, Picker } from './fields';
import { tileOptions } from './inspector';
import { ordinaryPages } from './pages';
import { useHouseLists } from './useHouseLists';
import { kindName } from './words';

export function AreaInspector({
  dashboard,
  grid,
  member,
  onChange,
  onRemove,
  onBack,
}: {
  dashboard: Dashboard;
  grid: Widget;
  member: AreaMember;
  onChange: (patch: Partial<Omit<AreaMember, 'area'>>) => void;
  onRemove: () => void;
  onBack: () => void;
}) {
  const house = useHouseLists();
  const area = useAreas().find(a => a.id === member.area);
  const name = area?.name ?? member.area;
  const pages = ordinaryPages(dashboard).map(p => ({ value: p.id, label: p.name }));
  const none = tr('builder.dashboard.field.none');

  return (
    <div className='b-inspector' aria-label={name}>
      <div className='b-section-head'>
        <h3 className='b-panel-title'>
          <button type='button' className='b-link' onClick={onBack}>
            {kindName(grid.kind)}
          </button>
          {' › '}
          <span dir='auto'>{name}</span>
        </h3>
        <button type='button' className='b-button' onClick={onRemove}>
          {tr('builder.dashboard.area.remove')}
        </button>
      </div>
      <p className='b-meta'>
        {kindName(grid.kind)} · {member.area}
      </p>
      {!area && (
        <p className='b-note' data-tone='alert' role='status'>
          {tr('builder.dashboard.area.missing', { id: member.area })}
        </p>
      )}

      <Field label={tr('builder.dashboard.widget.onTap')}>
        {id => (
          <Picker
            id={id}
            name='area-on_tap'
            value={member.on_tap}
            options={pages}
            none={tr('builder.dashboard.widget.onTapNone')}
            onChange={v => onChange({ on_tap: v })}
          />
        )}
      </Field>

      <Field label={tr('builder.dashboard.setting.light')}>
        {id => (
          <Picker
            id={id}
            name='area-light'
            value={member.light}
            options={tileOptions(house, member.area, TILE_LIGHT_DOMAINS, member.light)}
            none={none}
            onChange={v => onChange({ light: v })}
          />
        )}
      </Field>

      <Field label={tr('builder.dashboard.setting.temperature')}>
        {id => (
          <Picker
            id={id}
            name='area-temperature'
            value={member.temperature}
            options={tileOptions(house, member.area, TILE_TEMPERATURE_DOMAINS, member.temperature)}
            none={none}
            onChange={v => onChange({ temperature: v })}
          />
        )}
      </Field>
    </div>
  );
}
