/**
 * A horizontal value slider. Wraps @hakit's `ControlSlider`, which is fully
 * controlled and entity-agnostic -- it takes a number and gives one back, so
 * the wrapper is thin and the replacement cost is low.
 *
 * Three @hakit behaviours are corrected at this seam so that no caller has to
 * know about them. Each is a comment below: the intrinsic width, the
 * unrounded `onChange`, and the unreliable commit.
 */
import { ControlSlider } from '@hakit/components';
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
   * Called when a touch/press starts on the track and when it ends. The tile
   * around the slider uses this to disarm its long-press while the slider is
   * in use -- see the note on `handleDown`.
   */
  onInteracting?: (active: boolean) => void;
};

export function Slider({ value, onChange, onChangeApplied, disabled, thickness, onInteracting }: SliderProps) {
  // The slider is optimistic while dragging: a Home Assistant round-trip
  // takes long enough that a track snapping back under the finger feels
  // broken. While a drag is in progress `shown` follows the pointer; the
  // moment it ends, the incoming `value` takes over again. Keying the
  // optimistic value to "is a drag happening" rather than to a remembered
  // previous value means it can never stay pinned after the gesture.
  const [pointer, setPointer] = useState<number | null>(null);
  const shown = pointer ?? value;
  const latest = useRef(value);
  const dragging = useRef(false);

  // `step={1}` sets the slider's increment but does NOT quantise what it
  // reports: `onChange` emits the raw pointer position, so a drag produces
  // values like 54.3891438914532711 and the caption reads as a glitch until
  // Home Assistant round-trips an integer. @hakit's own light modal works
  // around this by rounding at each call site; rounding here means no caller
  // can forget.
  // Commit on our own pointer release rather than trusting
  // `onChangeApplied`. @hakit debounces that callback by 100 ms and then
  // SKIPS it when the pending value equals the slider's `value` prop -- so
  // whenever a drag ends on the value the slider already held, the change
  // silently never reaches Home Assistant. Committing from pointerup/
  // touchend is independent of that guard. `onChangeApplied` stays wired
  // underneath as a belt-and-braces path; `commit` is idempotent per drag.
  const commit = () => {
    if (!dragging.current) return;
    dragging.current = false;
    // Release the optimistic value: from here the incoming `value` is
    // authoritative, whether Home Assistant accepts the change or not.
    setPointer(null);
    onInteracting?.(false);
    onChangeApplied?.(latest.current);
  };

  // A tile built on `CardBase` binds a 300 ms long-press to its whole
  // surface to open the entity modal. `use-long-press` is configured there
  // with `cancelOnMovement: true`, which cancels only once the pointer leaves
  // a small tolerance square -- so a slow, deliberate slider adjustment stays
  // inside it, outlives the threshold, and pops the modal open on top of the
  // control being used. Telling the tile a drag is in progress lets it disarm
  // the modal for the duration. We cannot simply stop the pointer events
  // here: the slider is driven by @use-gesture through React's synthetic
  // events, so swallowing them freezes the control itself.
  const handleDown = () => {
    onInteracting?.(true);
    // A gesture that ends off the track (finger slid past the tile edge)
    // would never reach the handlers below, leaving the tile's modal
    // disarmed for good. A window-level release is the backstop.
    const release = () => {
      commit();
      onInteracting?.(false);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('touchend', release);
      window.removeEventListener('pointercancel', release);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('touchend', release);
    window.addEventListener('pointercancel', release);
  };

  const handleChange = (raw: number) => {
    const v = Math.round(raw);
    latest.current = v;
    dragging.current = true;
    setPointer(v);
    onChange?.(v);
  };

  // @hakit's ControlSlider has an intrinsic width that ignores its container
  // -- it renders ~320px regardless, overflowing any narrower tile. Wrapping
  // it in a constrained box and forcing the inner element to 100% is what
  // keeps it inside a 303px grid tile.
  //
  // These handlers only listen; they never stop propagation. The slider is
  // driven by @use-gesture, which binds through React's synthetic events, so
  // stopping the pointer sequence here would freeze the control itself.
  return (
    <div
      style={{ width: '100%', overflow: 'hidden', display: 'flex' }}
      onPointerDown={handleDown}
      onTouchStart={handleDown}
      onMouseDown={handleDown}
      onPointerUp={commit}
      onPointerCancel={commit}
      onPointerLeave={commit}
      onTouchEnd={commit}
      onMouseUp={commit}
    >
      <ControlSlider
        vertical={false}
        value={shown}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        thickness={thickness ?? t.touch.primary}
        borderRadius={t.radius.sm}
        sliderColor={disabled ? t.color.border : t.color.activeStrong}
        // Keep a visible sliver of fill at low values so "on but dim" never
        // looks identical to "off" from across the room.
        clampValueToBaseline
        onChange={handleChange}
        onChangeApplied={raw => {
          latest.current = Math.round(raw);
          commit();
        }}
        style={{ width: '100%', minWidth: 0, flex: 1 }}
      />
    </div>
  );
}
