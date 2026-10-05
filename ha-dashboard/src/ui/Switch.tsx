/**
 * Casa Panel's on/off switch (ADR-0013), ported from its `Switch`: a 56x32
 * track inside a 76x60 hit area, so it can sit in a Room Tile's corner
 * without a near miss opening the room instead.
 *
 * No press scale: the knob sliding across is the feedback. Its click stops
 * here, so toggling the light never also does what the surface under it does.
 */
import { t } from './theme';

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The accessible name -- "Luci Soggiorno". */
  label: string;
};

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type='button'
      aria-pressed={checked}
      aria-label={label}
      onClick={e => {
        e.stopPropagation();
        onChange(!checked);
      }}
      style={{
        width: 76,
        height: 60,
        padding: 0,
        border: 'none',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      <span
        style={{
          width: 56,
          height: 32,
          padding: 3,
          boxSizing: 'border-box',
          borderRadius: t.radius.pill,
          background: checked ? t.color.accent : t.color.switchOff,
          display: 'flex',
          alignItems: 'center',
          transition: 'background .18s ease',
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: t.radius.pill,
            background: checked ? t.color.onAccent : t.color.knobOff,
            marginLeft: checked ? 24 : 0,
            transition: 'margin-left .18s ease, background .18s ease',
          }}
        />
      </span>
    </button>
  );
}
