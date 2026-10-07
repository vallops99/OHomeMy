/**
 * The Group Widget (#52): Casa Panel's grouping card (`Card`), its title as
 * the section label and its members as the rows, a hairline between each
 * two. Each member is drawn by the same table as a Widget of its own
 * (`shared/shapes.tsx`), so a gate in a Group is the same gate, hold and all.
 */
import { shownTitle } from '../../document/schema';
import { useEntities } from '../../ha';
import { Card } from '../../ui/Card';
import { CARD_ALONE, EntityShape } from '../shared/shapes';
import type { WidgetProps } from '../types';
import type { groupSchema } from './schema';
import { groupDefaultTitle } from './title';

export function GroupWidget({ widget, settings }: WidgetProps<(typeof groupSchema)['settings']>) {
  const entities = useEntities();
  const members = settings.members.flatMap(id => entities.get(id) ?? []);
  // Checked present by the schema; this covers the render in between.
  if (members.length === 0) return null;

  const title = shownTitle(widget.title, groupDefaultTitle(members[0].domain));
  return (
    <Card title={title === '' ? undefined : title} style={CARD_ALONE}>
      {members.map(member => (
        <EntityShape key={member.id} entity={member} variant={widget.variant} member />
      ))}
    </Card>
  );
}
