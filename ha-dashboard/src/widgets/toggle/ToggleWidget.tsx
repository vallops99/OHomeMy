/**
 * The toggle Widget (#50): one thing that is on or off, in `ToggleView`'s
 * shape; a Fault while it is Unavailable (#52, `EntityWidget`).
 */
import { EntityWidget } from '../shared/EntityWidget';
import type { WidgetProps } from '../types';
import type { toggleSchema } from './schema';

export function ToggleWidget(props: WidgetProps<(typeof toggleSchema)['settings']>) {
  return <EntityWidget {...props} />;
}
