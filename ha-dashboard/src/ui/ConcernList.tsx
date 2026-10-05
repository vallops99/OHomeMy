/**
 * A Concern list (#30, CONTEXT.md): the entities behind one Concern, shown
 * over the current Page when its chip is tapped.
 *
 * Panel-local, and neither a Popup nor a Page: only the panel that was
 * tapped shows it, Home Assistant never opens or closes it, and nothing is
 * Placed in it. So it keeps out of `Popup.tsx` and the helper, and lives in
 * React state in `ChipRow`, which owns the chip that opened it.
 *
 * It sits above the panel and under a Popup (`Z_POPUP`): a Popup that
 * arrives covers the list without closing it, and the list is still there
 * when the Popup goes.
 *
 * This component only renders. What closes it is split by who knows:
 * - its close button and a tap on the backdrop, here (`onClose`);
 * - its own idle spell, here, since no idle return runs on `page:main` or
 *   on a phone;
 * - its Concern clearing, in `ChipRow`, which holds the live report;
 * - the panel leaving the Page, by `GlanceView` keying `ChipRow` on it.
 *
 * Rows are information, never controls: a tap on one does nothing.
 */
import { createPortal } from 'react-dom';
import { useAreas, type Health } from '../ha';
import { CloseButton } from './CloseButton';
import { concernRows } from './concernList';
import { isPhone } from './device';
import { DOMAIN_ICON, Icon } from './Icon';
import { useIdleClose } from './idle';
import { Z_CONCERN_LIST } from './layers';
import { t } from './theme';

/** The wall card's width: wide enough for a name and its Area on one line. */
const CARD_W = 560;

export type ConcernListProps = {
  /** The Concern as it stands now; the list follows it while open. */
  concern: Health;
  onClose: () => void;
};

export function ConcernList({ concern, onClose }: ConcernListProps) {
  const rows = concernRows(concern, useAreas());
  const fault = concern.level === 'fault';
  useIdleClose(onClose);

  return createPortal(
    // The backdrop: a tap on it, and not on the card, closes the list.
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_CONCERN_LIST,
        background: t.color.backdrop,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        role='dialog'
        aria-label={concern.headline}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: t.color.surface,
          color: t.color.textPrimary,
          boxSizing: 'border-box',
          // Full screen on a phone (ADR-0011); a centred card on the wall.
          ...(isPhone
            ? { width: '100%', height: '100dvh' }
            : {
                width: CARD_W,
                maxHeight: '80%',
                borderRadius: t.radius.tile,
                border: `1px solid ${fault ? t.color.faultLine : t.color.border}`,
              }),
        }}
      >
        <header
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: t.space.md,
            padding: t.space.md,
            borderBottom: `1px solid ${t.color.border}`,
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: t.space.sm,
              fontSize: t.font.glanceM,
              fontWeight: 700,
              color: fault ? t.color.fault : t.color.textPrimary,
            }}
          >
            {concern.headline}
          </span>
          <CloseButton onClose={onClose} />
        </header>
        <ul style={{ listStyle: 'none', margin: 0, padding: `${t.space.sm}px 0`, overflowY: 'auto', minHeight: 0 }}>
          {rows.map(({ entity, areaName }) => (
            <li
              key={entity.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: t.space.md,
                padding: `${t.space.sm}px ${t.space.md}px`,
                minHeight: t.touch.primary,
                boxSizing: 'border-box',
              }}
            >
              <span style={{ display: 'flex', flexShrink: 0, color: fault ? t.color.fault : t.color.textSecondary }}>
                <Icon name={DOMAIN_ICON[entity.domain] ?? 'mdi:help-circle-outline'} size={28} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span
                  style={{ fontSize: t.font.body, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {entity.name}
                </span>
                <span style={{ fontSize: t.font.caption, color: t.color.textSecondary }}>{areaName}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
}
