/**
 * A `select` (#36): what it is in `left` or `right`. A row with its name and
 * current option; tapping it opens a picker of every option Home Assistant
 * reports, in our tokens rather than a native `<select>` -- on a kiosk a
 * native picker is the browser's, drawn in its own style and at its own
 * size, and Fully Kiosk may not show it at all.
 *
 * The picker is panel-local, like a Concern list: a centred card over the
 * current Page, always inside the viewport (its list scrolls when the options
 * outnumber the room), closing on a choice, its close button, a tap outside,
 * or the idle spell. An Unavailable select is a Fault and opens nothing.
 */
import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useActions, usePortalRoot, type Entity } from '../ha';
import { CloseButton } from './CloseButton';
import { isPhone } from './device';
import { entityIcon, Icon } from './Icon';
import { useIdleClose } from './idle';
import { Z_PICKER } from './layers';
import { pressable } from './pressable';
import { rowStyle } from './rowShape';
import { stateLabel } from './stateLabel';
import { v } from './vars';

export type SelectTileProps = {
  entity: Entity;
  /** Overrides on the root box: a Widget sizes it to its own (`src/widgets`). */
  style?: CSSProperties;
};

/** The picker card's width on the wall: wide enough for a long option. */
const PICKER_W = 480;

const optionsOf = (entity: Entity): string[] =>
  Array.isArray(entity.attributes.options) ? (entity.attributes.options as unknown[]).map(String) : [];

export function SelectTile({ entity, style }: SelectTileProps) {
  const [open, setOpen] = useState(false);
  const unavailable = entity.unavailable;
  const press = pressable(unavailable ? undefined : () => setOpen(true));

  return (
    <>
      <div
        {...press}
        aria-haspopup='dialog'
        style={{
          ...rowStyle({ active: false, unavailable }),
          maxHeight: v.layout.tileMaxH,
          display: 'flex',
          alignItems: 'center',
          gap: v.space.md,
          padding: `0 ${v.space.md}`,
          boxSizing: 'border-box',
          border: `1px solid ${unavailable ? v.color.alertLine : v.color.line}`,
          ...press.style,
          ...style,
        }}
      >
        <span style={{ width: 34, display: 'flex', justifyContent: 'center', color: unavailable ? v.color.alert : v.color.inkMuted }}>
          <Icon name={unavailable ? 'mdi:alert-circle' : entityIcon(entity)} size={26} />
        </span>
        <span
          dir='auto'
          title={entity.name}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: v.font.glanceM,
            fontWeight: 600,
            color: v.color.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {entity.name}
        </span>
        <span
          dir='auto'
          style={{
            flexShrink: 0,
            maxWidth: '45%',
            fontSize: v.font.body,
            fontWeight: unavailable ? 700 : 600,
            color: unavailable ? v.color.alert : v.color.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {unavailable ? stateLabel(entity).toUpperCase() : entity.state}
        </span>
        {!unavailable && (
          <span style={{ display: 'flex', flexShrink: 0, color: v.color.inkMuted }}>
            <Icon name='mdi:chevron-down' size={28} />
          </span>
        )}
      </div>
      {open && <SelectPicker entity={entity} onClose={() => setOpen(false)} />}
    </>
  );
}

function SelectPicker({ entity, onClose }: { entity: Entity; onClose: () => void }) {
  const actions = useActions();
  useIdleClose(onClose);
  const portalRoot = usePortalRoot();

  return createPortal(
    // The backdrop: a tap on it, and not on the card, closes the picker.
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: Z_PICKER,
        background: v.color.backdrop,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        role='dialog'
        aria-label={entity.name}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: v.color.surface,
          color: v.color.ink,
          boxSizing: 'border-box',
          // Never past the viewport: the card is capped and its list scrolls.
          //
          // The one place a Widget's code asks about the device (#62): the
          // picker covers the whole screen, so the screen is its box. A
          // phone's fills it; a wall's is a card in the middle. Its type
          // follows the page root's scale, which is the device's too.
          ...(isPhone
            ? { width: '100%', maxHeight: '100dvh' }
            : { width: PICKER_W, maxWidth: '100%', maxHeight: '90%', borderRadius: v.radius.tile, border: `1px solid ${v.color.line}` }),
        }}
      >
        <header
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: v.space.md,
            padding: v.space.md,
            borderBottom: `1px solid ${v.color.line}`,
          }}
        >
          <span
            dir='auto'
            style={{
              fontSize: v.font.glanceM,
              fontWeight: 700,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entity.name}
          </span>
          <CloseButton onClose={onClose} />
        </header>
        <div
          role='listbox'
          style={{ display: 'flex', flexDirection: 'column', gap: v.space.sm, padding: v.space.md, overflowY: 'auto', minHeight: 0 }}
        >
          {optionsOf(entity).map(option => {
            const current = option === entity.state;
            return (
              <button
                key={option}
                type='button'
                role='option'
                aria-selected={current}
                onClick={() => {
                  if (!current) actions.call('select', 'select_option', entity.id, { option });
                  onClose();
                }}
                style={{
                  flexShrink: 0,
                  minHeight: v.touch.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: v.space.md,
                  padding: `0 ${v.space.md}`,
                  borderRadius: v.radius.sm,
                  border: `1px solid ${current ? 'transparent' : v.color.line}`,
                  background: current ? v.color.accent : v.color.surfaceWell,
                  color: current ? v.color.onAccent : v.color.ink,
                  fontSize: v.font.glanceM,
                  fontWeight: 600,
                  textAlign: 'start',
                  cursor: 'pointer',
                }}
              >
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option}</span>
                {current && <Icon name='mdi:check' size={26} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    portalRoot
  );
}
