/**
 * Casa Panel's dimmer (ADR-0013), ported from its `Dimmer`: a 56 px bar that
 * is its own thumb -- drag or tap anywhere on it to set 0-100. The fill is
 * `accent-soft` up to the level; the right end reads the percentage, or
 * "Spento" at 0, because 0 is off.
 *
 * A native range input underneath, at opacity 0, as the design system has
 * it: keyboard and screen readers get a real slider for free, and the browser
 * owns the gesture.
 *
 * `Slider`'s two lessons carry over. The bar is optimistic while it is held,
 * so a Home Assistant round-trip does not snap it back under the finger, and
 * the service is called once, when the hold ends -- never on every step of a
 * drag. The release is also watched on `window`, so a finger that slides off
 * the bar before lifting still commits.
 */
import { useRef, useState } from 'react';
import { Icon } from './Icon';
import { t } from './theme';

export type DimmerProps = {
  /** 0-100; 0 is off. */
  value: number;
  /** Called once per gesture, when it ends, with a whole number. */
  onCommit: (value: number) => void;
  /** The accessible name -- "Luminosità Cucina". */
  label: string;
};

export function Dimmer({ value, onCommit, label }: DimmerProps) {
  // Held, the bar shows the finger; released, the incoming `value` is
  // authoritative again, whether Home Assistant accepts the change or not.
  const [held, setHeld] = useState<number | null>(null);
  const latest = useRef<number | null>(null);
  const shown = held ?? value;

  const commit = () => {
    const v = latest.current;
    latest.current = null;
    setHeld(null);
    if (v !== null) onCommit(v);
  };
  const watchRelease = () => {
    const release = () => {
      commit();
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  };

  return (
    <div
      style={{
        position: 'relative',
        height: t.size.targetControl,
        flexShrink: 0,
        borderRadius: t.radius.control,
        background: t.color.surfaceControl,
        overflow: 'hidden',
      }}
    >
      <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${shown}%`, background: t.color.accentSoft }} />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${t.space[4]}px`,
          pointerEvents: 'none',
          fontSize: t.type.meta.size,
          fontWeight: 500,
          color: shown > 0 ? t.color.ink : t.color.inkMuted,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <Icon name='mdi:weather-sunny' size={20} />
        <span>{shown > 0 ? `${shown}%` : 'Spento'}</span>
      </div>
      <input
        type='range'
        min={0}
        max={100}
        step={1}
        value={shown}
        aria-label={label}
        onPointerDown={watchRelease}
        onChange={e => {
          const v = Number(e.target.value);
          latest.current = v;
          setHeld(v);
        }}
        // A key press is a whole gesture of its own.
        onKeyUp={commit}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          margin: 0,
          opacity: 0,
          cursor: 'ew-resize',
          // The page keeps vertical panning, so a scrolling Room Grid can
          // still be scrolled from a dimmer; sideways is the dimmer's.
          touchAction: 'pan-y',
        }}
      />
    </div>
  );
}
