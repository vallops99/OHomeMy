/**
 * The Popup layer (#58, CONTEXT.md "Popup"): while `select.ohomemy_popup`
 * names a Popup this Dashboard lays out, its Page covers whatever Page is
 * current, opaque and full screen, with no Navbar. A Dashboard that defines
 * no Page for the name shows nothing.
 *
 * This layer never decides whether the Popup is open. It mounts while the
 * select names it and unmounts when the select goes back to `none`; the
 * close button only *asks* Home Assistant to select `none`, so the Popup
 * stays up until every Dashboard hears the same answer, and closing it on
 * one closes it on all.
 *
 * Tapping a Widget that opens a Page closes the Popup too. The tap is not
 * stopped: the Page opens underneath, on this Dashboard's own navigation,
 * while the select is cleared for everyone.
 *
 * A touch anywhere but the close button is reported, at most every few
 * seconds, by pressing `button.ohomemy_popup_activity`, so an automation
 * can restart its auto-close wait (ADR-0015, "Popups").
 */
import { useCallback, useRef, type MouseEvent, type PointerEvent } from 'react';
import type { Dashboard, Page as PageType } from '../document/types';
import { useActions, useEntityState } from '../ha';
import { tr } from '../i18n';
import { Icon } from '../ui/Icon';
import { Z_POPUP } from '../ui/layers';
import { Page } from './Page';
import { ACTIVITY_INTERVAL_MS, NO_POPUP, POPUP_ACTIVITY, POPUP_SELECT, activityGate, openPopup, opensPage, popupPage } from './popup';

export function PopupLayer({ dashboard }: { dashboard: Dashboard }) {
  const page = popupPage(dashboard, openPopup(useEntityState(POPUP_SELECT)));
  const actions = useActions();
  const close = useCallback(() => actions.call('select', 'select_option', POPUP_SELECT, { option: NO_POPUP }), [actions]);
  const report = useCallback(() => actions.press(POPUP_ACTIVITY), [actions]);

  if (!page) return null;
  // Keyed to the Page, so another Popup replacing this one starts its
  // activity pacing afresh.
  return <Popup key={page.id} page={page} overflow={dashboard.settings.overflow} onClose={close} onActivity={report} />;
}

type PopupProps = {
  page: PageType;
  overflow: Dashboard['settings']['overflow'];
  onClose: () => void;
  onActivity: () => void;
};

function Popup({ page, overflow, onClose, onActivity }: PopupProps) {
  // A ref, not state: bookkeeping for an event handler, nothing renders from it.
  const gate = useRef(activityGate(ACTIVITY_INTERVAL_MS));

  const onPointerDown = (e: PointerEvent) => {
    // The close button is the one touch that is not activity: it asks for
    // the opposite of "keep this open".
    if (e.target instanceof Element && e.target.closest('[data-close]')) return;
    if (gate.current(Date.now())) onActivity();
  };

  const onClick = (e: MouseEvent) => {
    // Only the part that navigates: the whole box of a Widget whose kind
    // does nothing on a tap, or the Open button beside one that does (a
    // toggle on a Popup still just toggles; `tap.ts`), a Room Tile's
    // surface, and the same for a Group's Member or a Room Grid's.
    const opener = e.target instanceof Element ? e.target.closest('[data-opens]') : null;
    const box = opener?.closest('[data-widget]');
    const member = opener?.closest('[data-member]')?.getAttribute('data-member') ?? null;
    if (opensPage(page, box?.getAttribute('data-widget') ?? null, member)) onClose();
  };

  return (
    <div
      className='ohm-popup'
      role='dialog'
      aria-label={page.name}
      style={{ zIndex: Z_POPUP }}
      // Capture, so a touch counts even where the control under it stops
      // the event from bubbling (a slider, @hakit's press handling).
      onPointerDownCapture={onPointerDown}
      onClickCapture={onClick}
    >
      {page.widgets.length === 0 ? (
        <div className='ohm-notice' role='status'>
          <span className='ohm-notice-title'>{tr('popup.empty.title')}</span>
          <span className='ohm-notice-detail'>{tr('popup.empty.detail')}</span>
        </div>
      ) : (
        <Page page={page} overflow={overflow} />
      )}
      <button
        type='button'
        className='ohm-popup-close'
        data-close
        onClick={onClose}
        aria-label={tr('common.close')}
        title={tr('common.close')}
      >
        <Icon name='mdi:close' size={24} />
      </button>
    </div>
  );
}

/**
 * The layer's stylesheet, beside the renderer's. The Dashboard becomes the
 * Popup's containing block, so the Popup covers the panel and not Home
 * Assistant's sidebar. The close button sits in the top corner at the end
 * of the line (the right, or the left right to left) over
 * the Popup's own grid, which the admin lays out edge to edge (a doorbell's
 * camera may fill it), at Casa Panel's minimum touch target.
 */
export const POPUP_CSS = `
  .ohm-dashboard { position: relative; }
  .ohm-popup {
    position: absolute;
    inset: 0;
    background: var(--bg);
    overflow: hidden;
  }
  .ohm-popup-close {
    position: absolute;
    top: var(--space-4);
    inset-inline-end: var(--space-4);
    width: var(--target-min);
    height: var(--target-min);
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line-strong);
    background: var(--surface-control);
    color: var(--ink);
    cursor: pointer;
  }
  .ohm-popup-close:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
`;
