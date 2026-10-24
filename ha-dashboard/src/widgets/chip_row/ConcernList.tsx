/**
 * A Concern list (CONTEXT.md; from `ui/ConcernList.tsx`): the entities
 * behind one Concern, over the current Page, each named with its Area. Rows
 * are information, never controls.
 *
 * Portalled to the Dashboard's portal root, because a Widget's box is a size
 * container and so the containing block of anything `fixed` inside it. It
 * sits under a Popup (`Z_CONCERN_LIST`): a Popup that arrives covers the
 * list without closing it.
 *
 * What closes it: its close button and a tap on the backdrop (`onClose`),
 * its own idle spell (here), its Concern clearing (the Chip Row, which
 * holds the live Concerns) and the device leaving the Page (which unmounts
 * the Widget).
 */
import { createPortal } from 'react-dom';
import { useAreas, usePortalRoot } from '../../ha';
import type { Concern } from '../../ha/verdict';
import { tr } from '../../i18n';
import { concernRows } from '../../ui/concernList';
import { DOMAIN_ICON, Icon } from '../../ui/Icon';
import { useIdleClose } from '../../ui/idle';
import { Z_CONCERN_LIST } from '../../ui/layers';
import { concernHeadline } from './chips';

export function ConcernList({ concern, onClose }: { concern: Concern; onClose: () => void }) {
  const rows = concernRows(concern, useAreas(), tr('chips.noArea'));
  const headline = concernHeadline(concern);
  const portalRoot = usePortalRoot();
  useIdleClose(onClose);

  return createPortal(
    // The backdrop: a tap on it, and not on the card, closes the list.
    <div
      className='ohm-chip_row-list-backdrop'
      style={{ zIndex: Z_CONCERN_LIST }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className='ohm-chip_row-list-card' role='dialog' aria-label={headline} data-level={concern.level}>
        <header className='ohm-chip_row-list-header'>
          <span className='ohm-chip_row-list-title'>{headline}</span>
          <button
            type='button'
            className='ohm-chip_row-list-close'
            onClick={onClose}
            aria-label={tr('common.close')}
            title={tr('common.close')}
          >
            <Icon name='mdi:close' size={24} />
          </button>
        </header>
        <ul className='ohm-chip_row-list-rows'>
          {rows.map(({ entity, areaName, stateText }) => (
            <li key={entity.id} className='ohm-chip_row-list-row'>
              <span className='ohm-chip_row-list-icon'>
                <Icon name={DOMAIN_ICON[entity.domain] ?? 'mdi:help-circle-outline'} size={26} />
              </span>
              <span className='ohm-chip_row-list-text'>
                <span className='ohm-chip_row-list-name' dir='auto'>
                  {entity.name}
                </span>
                <span className='ohm-chip_row-list-area'>{stateText === null ? areaName : `${areaName} · ${stateText}`}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    portalRoot
  );
}
