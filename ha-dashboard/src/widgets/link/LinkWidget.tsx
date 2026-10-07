/**
 * The Link Widget (#54). The renderer makes its whole box the way to its
 * Page (`renderer/tap.ts`), with Casa Panel's press feedback, so this only
 * draws it: an off tile's surface, since a Link is never on.
 */
import { shownTitle } from '../../document/schema';
import { useDashboardNavigation } from '../../renderer/navigationContext';
import { Icon } from '../../ui/Icon';
import type { WidgetProps } from '../types';
import type { linkSchema } from './schema';

const DEFAULT_ICON = 'mdi:arrow-right';

export function LinkWidget({ widget, settings }: WidgetProps<(typeof linkSchema)['settings']>) {
  const { pageName } = useDashboardNavigation();
  const page = widget.on_tap === null ? undefined : pageName(widget.on_tap);
  return (
    <div className='ohm-link' data-variant={widget.variant}>
      <span className='ohm-link-icon'>
        <Icon name={settings.icon ?? DEFAULT_ICON} size={30} mirrored={settings.icon === null} />
      </span>
      <span className='ohm-link-title' dir='auto'>
        {shownTitle(widget.title, page ?? '')}
      </span>
      {widget.variant === 'full' && (
        <span className='ohm-link-chevron'>
          <Icon name='mdi:chevron-right' size={20} mirrored />
        </span>
      )}
    </div>
  );
}
