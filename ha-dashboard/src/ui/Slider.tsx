/**
 * A horizontal value slider: a light's brightness on its row, a player's
 * volume. Casa Panel's dimmer track (ADR-0013) under a native range input
 * at opacity 0, as `Dimmer` is: keyboard and screen readers get a real
 * slider, and the browser owns the gesture.
 *
 * It replaced @hakit's `ControlSlider` for right to left (#59). That one
 * reads the pointer against the track's left edge whatever the direction,
 * so an Arabic viewer's bar filled from the left, against the line; a range
 * input in a right-to-left box runs from the right, and the fill here starts
 * at the same inline edge, so the finger and the fill always agree.
 *
 * Two lessons from the @hakit version carry over. The track is optimistic
 * while held, so a Home Assistant round-trip does not snap it back under the
 * finger, and `onChangeApplied` -- the one that calls a service -- fires
 * once, when the gesture ends, never on every step. The release is also
 * watched on `window`, so a finger that slides off the track still commits.
 */
import { useRef, useState } from 'react';
import { t } from './theme';

export type SliderProps = {
  /** 0-100. */
  value: number;
  /** Fired continuously while dragging. Always a whole number. */
  onChange?: (value: number) => void;
  /** Fired once when the drag ends -- the only one that should call a service. Always a whole number. */
  onChangeApplied?: (value: number) => void;
  disabled?: boolean;
  /** Track height. Defaults to the ADR-0001 primary touch target, 64 px. */
  thickness?: number;
  /**
   * Called when a touch/press starts on the track and when it ends. A tile
   * that keeps its long-press modal uses this to disarm it while the slider
   * is in use: a slow, deliberate drag outlives `CardBase`'s 300 ms
   * long-press and would pop the modal open over the control being used.
   */
  onInteracting?: (active: boolean) => void;
};

/**
 * The least fill shown for a value above 0, as a share of the track: "on but
 * dim" must never look identical to "off" from across the room.
 */
const BASELINE = 9;

export function Slider({ value, onChange, onChangeApplied, disabled, thickness, onInteracting }: SliderProps) {
  // Held, the track shows the finger; released, the incoming `value` is
  // authoritative again, whether Home Assistant accepts the change or not.
  const [held, setHeld] = useState<number | null>(null);
  const latest = useRef<number | null>(null);
  const shown = held ?? value;

  const commit = () => {
    const v = latest.current;
    latest.current = null;
    setHeld(null);
    onInteracting?.(false);
    if (v !== null) onChangeApplied?.(v);
  };
  const watchRelease = () => {
    onInteracting?.(true);
    const release = () => {
      commit();
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  };

  const fill = shown <= 0 ? 0 : BASELINE + (shown * (100 - BASELINE)) / 100;

  return (
    <div
      // Claims every gesture that starts on the track: an ancestor that
      // swipes sees the mark and leaves the gesture alone.
      data-gesture-owner
      data-disabled={disabled || undefined}
      style={{
        position: 'relative',
        width: '100%',
        height: thickness ?? t.touch.primary,
        borderRadius: t.radius.sm,
        background: t.color.surfaceControl,
        overflow: 'hidden',
        opacity: disabled ? 0.38 : 1,
      }}
    >
      <div
        aria-hidden
        style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: `${fill}%`, background: t.color.accentSoft }}
      />
      <input
        type='range'
        min={0}
        max={100}
        step={1}
        value={shown}
        disabled={disabled}
        onPointerDown={watchRelease}
        onChange={e => {
          const v = Math.round(Number(e.target.value));
          latest.current = v;
          setHeld(v);
          onChange?.(v);
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
          cursor: disabled ? 'default' : 'ew-resize',
          // The page keeps vertical panning; sideways is the slider's.
          touchAction: 'pan-y',
        }}
      />
    </div>
  );
}
