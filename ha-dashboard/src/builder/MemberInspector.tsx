/**
 * A selected Member's settings (#73): one entity in a Group, with its own
 * name, Variant and tap, each `null` while unset as a Widget's are. It
 * reuses the Widget inspector's controls: the name is the title's pattern,
 * the tap the same picker over the ordinary Pages.
 *
 * Adding, removing and reordering stay the Group's list's; here a Member can
 * only be removed, which puts the selection back on the Group. A Member Home
 * Assistant no longer has stays selectable, and says so.
 */
import type { Member, Variant } from '../document/schema';
import type { Dashboard, Widget } from '../document/types';
import { useEntities } from '../ha';
import { tr } from '../i18n';
import { VARIANT_DOMAINS } from '../widgets/shared/domains';
import { Field, Picker } from './fields';
import { ordinaryPages } from './pages';
import { kindName } from './words';

export function MemberInspector({
  dashboard,
  group,
  member,
  onChange,
  onRemove,
  onBack,
}: {
  dashboard: Dashboard;
  group: Widget;
  member: Member;
  onChange: (patch: Partial<Omit<Member, 'entity'>>) => void;
  onRemove: () => void;
  onBack: () => void;
}) {
  const entity = useEntities().get(member.entity);
  const houseName = entity?.name ?? member.entity;
  const domain = member.entity.slice(0, member.entity.indexOf('.'));
  const pages = ordinaryPages(dashboard).map(p => ({ value: p.id, label: p.name }));
  const variants: { value: Variant; label: string }[] = [
    { value: 'full', label: tr('builder.dashboard.widget.variant.full') },
    { value: 'compact', label: tr('builder.dashboard.widget.variant.compact') },
  ];

  return (
    <div className='b-inspector' aria-label={member.name ?? houseName}>
      <div className='b-section-head'>
        <h3 className='b-panel-title'>
          <button type='button' className='b-link' onClick={onBack}>
            {tr('builder.dashboard.member.group')}
          </button>
          {' › '}
          <span dir='auto'>{member.name ?? houseName}</span>
        </h3>
        <button type='button' className='b-button' onClick={onRemove}>
          {tr('builder.dashboard.member.remove')}
        </button>
      </div>
      <p className='b-meta'>
        {kindName(group.kind)} · {member.entity}
      </p>
      {!entity && (
        <p className='b-note' data-tone='alert' role='status'>
          {tr('builder.dashboard.member.missing', { id: member.entity })}
        </p>
      )}

      <Field label={tr('builder.dashboard.member.name')}>
        {id => (
          <div className='b-title'>
            <div className='b-segmented' role='radiogroup' aria-label={tr('builder.dashboard.member.name')}>
              <button type='button' role='radio' aria-checked={member.name === null} onClick={() => onChange({ name: null })}>
                {tr('builder.dashboard.member.nameDefault')}
              </button>
              <button
                type='button'
                role='radio'
                aria-checked={member.name !== null}
                // Own starts from Home Assistant's name, to change rather than retype.
                onClick={() => member.name === null && onChange({ name: houseName })}
              >
                {tr('builder.dashboard.member.nameOwn')}
              </button>
            </div>
            {member.name !== null && (
              <input
                className='b-input'
                id={id}
                name='member-name'
                dir='auto'
                value={member.name}
                maxLength={200}
                // An empty name is never stored: emptied, the name is unset.
                onChange={e => onChange({ name: e.target.value === '' ? null : e.target.value })}
              />
            )}
          </div>
        )}
      </Field>

      {VARIANT_DOMAINS.includes(domain) && (
        <Field label={tr('builder.dashboard.widget.variant')}>
          {id => (
            <Picker
              id={id}
              name='member-variant'
              value={member.variant}
              options={variants}
              none={tr('builder.dashboard.member.variantFollow', { variant: tr(`builder.dashboard.widget.variant.${group.variant}`) })}
              // Set to the Group's own Variant, it stays set: it no longer follows.
              onChange={v => onChange({ variant: v as Variant | null })}
            />
          )}
        </Field>
      )}

      <Field label={tr('builder.dashboard.widget.onTap')}>
        {id => (
          <Picker
            id={id}
            name='member-on_tap'
            value={member.on_tap}
            options={pages}
            none={tr('builder.dashboard.member.onTapNone')}
            onChange={v => onChange({ on_tap: v })}
          />
        )}
      </Field>
    </div>
  );
}
