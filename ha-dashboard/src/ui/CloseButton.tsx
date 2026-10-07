/**
 * The round close button (#24, decision 4), translucent so it reads over a
 * Feed. Shared by the Popup and the Concern list (#30), which close the same
 * way. `data-close` lets an overlay tell a touch on it from other touches:
 * the Popup does not report it as activity.
 */
import { Icon } from './Icon';
import { tr } from '../i18n';
import { v } from './vars';

/** The glyph is half the button. */
const GLYPH = parseFloat(v.layout.popupClose) / 2;

export function CloseButton({ onClose }: { onClose: () => void }) {
  const size = v.layout.popupClose;
  return (
    <button
      type='button'
      data-close
      onClick={onClose}
      aria-label={tr('common.close')}
      title={tr('common.close')}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: v.radius.pill,
        border: `1px solid ${v.color.line}`,
        background: v.color.backdrop,
        backdropFilter: 'blur(6px)',
        color: v.color.ink,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <Icon name='mdi:close' size={GLYPH} />
    </button>
  );
}
