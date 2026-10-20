/**
 * The Group Widget (#52): Casa Panel's grouping card (`Card`), its title as
 * the section label and its members as the rows, a hairline between each
 * two. Each member is drawn by the same table as a Widget of its own
 * (`shared/shapes.tsx`), so a gate in a Group is the same gate, hold and all.
 *
 * Each Member (#73) shows its own name where one is written, in its own
 * Variant where one is set, and honours its own tap by its Domain
 * (`renderer/tap.ts` `memberTap`): an Open button at the end of a row that
 * acts on a tap, or the whole row for one that does not. Each row's wrapper
 * is marked `data-member`, which the Popup layer reads to close on a
 * Member's tap and the Builder's preview to find each Member.
 */
import { shownTitle } from '../../document/schema';
import { useEntities } from '../../ha';
import { tr } from '../../i18n';
import { useDashboardNavigation } from '../../renderer/navigationContext';
import { memberTap } from '../../renderer/tap';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { pressable } from '../../ui/pressable';
import { CARD_ALONE, EntityShape } from '../shared/shapes';
import type { WidgetProps } from '../types';
import type { groupSchema } from './schema';
import { memberShown } from './members';
import { groupDefaultTitle } from './title';

export function GroupWidget({ widget, settings }: WidgetProps<(typeof groupSchema)['settings']>) {
  const entities = useEntities();
  const navigation = useDashboardNavigation();
  const members = settings.members.flatMap(member => {
    const entity = entities.get(member.entity);
    return entity ? [{ member, entity }] : [];
  });
  // Checked present by the schema; this covers the render in between.
  if (members.length === 0) return null;

  const title = shownTitle(widget.title, groupDefaultTitle(members[0].entity.domain));
  return (
    <Card title={title === '' ? undefined : title} style={CARD_ALONE}>
      {members.map(({ member, entity }) => {
        const tap = memberTap(entity.id, member.on_tap, p => navigation.pageName(p) !== undefined);
        return (
          <div
            key={entity.id}
            className='ohm-group-member'
            data-member={entity.id}
            {...(tap.as === 'box' && { ...pressable(() => navigation.open(tap.page)), style: undefined, 'data-opens': true })}
          >
            <EntityShape {...memberShown(member, entity, widget.variant)} member />
            {tap.as === 'button' && (
              <button
                type='button'
                className='ohm-open'
                data-opens
                aria-label={tr('renderer.open', { page: navigation.pageName(tap.page) ?? '' })}
                onClick={() => navigation.open(tap.page)}
              >
                <Icon name='mdi:chevron-right' size={20} mirrored />
              </button>
            )}
          </div>
        );
      })}
    </Card>
  );
}
