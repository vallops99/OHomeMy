/**
 * The component of every per-Domain kind (#52): the one entity its `entity`
 * setting names, in its Domain's shape (`shapes.tsx`), under the Widget's
 * title. A kind is then only its schema: which Domains, which Variants.
 *
 * The Default title is the entity's own name. A title someone wrote takes
 * its place, as written, wherever the shape shows the name.
 */
import { shownTitle } from '../../document/schema';
import { useEntityState, type Entity } from '../../ha';
import type { WidgetProps } from '../types';
import { EntityShape } from './shapes';

type EntityFields = { entity: { type: 'entity'; domains: readonly string[] } };

export function EntityWidget({ widget, settings }: WidgetProps<EntityFields>) {
  const entity = useEntityState(settings.entity);
  // Checked present by the schema; this covers the render in between.
  if (!entity) return null;
  return <EntityShape entity={titled(entity, widget.title)} variant={widget.variant} member={false} />;
}

/** The entity under the Widget's title: the shapes all show `entity.name`. */
function titled(entity: Entity, title: string | null): Entity {
  return title === null ? entity : { ...entity, name: shownTitle(title, entity.name) };
}
