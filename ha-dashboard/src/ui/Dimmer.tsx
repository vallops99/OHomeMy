/**
 * Casa Panel's dimmer (ADR-0013), ported from its `Dimmer`: a 56 px bar that
 * is its own thumb -- drag or tap anywhere on it to set 0-100. The fill is
 * `accent-soft` up to the level; the end reads the percentage, or "Off"
 * at 0, because 0 is off.
 *
 * A native range input underneath, at opacity 0, as the design system has
 * it: keyboard and screen readers get a real slider for free, and the browser
 * owns the gesture.
 *
 * `Slider`'s two lessons carry over. The bar is optimistic while it is held
 * and after, until Home Assistant catches up (`pending.ts`), so a round-trip
 * does not snap it back under the finger or after it lifts; and the service
 * is called once, when the hold ends -- never on every step of a drag. The
 * release is also watched on `window`, so a finger that slides off the bar
 * before lifting still commits.
 */
import { useRef } from 'react';
import { fmt, tr } from '../i18n';
import { Icon } from './Icon';
import { usePendingValue } from './usePendingValue';
import { v } from './vars';

export type DimmerProps = {
  /** 0-100; 0 is off. */
  value: number;
  /** Called once per gesture, when it ends, with a whole number. */
  onCommit: (value: number) => void;
  /** The accessible name -- "Cucina brightness". */
  label: string;
};

export function Dimmer({ value, onCommit, label }: DimmerProps) {
  // Held, the bar shows the finger; released, it keeps the released value
  // until Home Assistant reports a change, or gives up waiting (`pending.ts`).
  const pending = usePendingValue(value);
  const latest = useRef<number | null>(null);
  const shown = pending.shown;

  const commit = () => {
    const v = latest.current;
    latest.current = null;
    if (v === null) return;
    pending.release(v);
    onCommit(v);
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
        height: v.size.targetControl,
        flexShrink: 0,
        borderRadius: v.radius.control,
        background: v.color.surfaceControl,
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: `${shown}%`, background: v.color.accentSoft }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${v.space[4]}`,
          pointerEvents: 'none',
          fontSize: v.type.meta.size,
          fontWeight: 500,
          color: shown > 0 ? v.color.ink : v.color.inkMuted,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <Icon name='mdi:weather-sunny' size={20} />
        <span>{shown > 0 ? fmt.percent(shown) : tr('dimmer.off')}</span>
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
          pending.hold(v);
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
