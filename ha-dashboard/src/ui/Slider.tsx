/**
 * A horizontal value slider. Wraps @hakit's `ControlSlider`, which is fully
 * controlled and entity-agnostic -- it takes a number and gives one back, so
 * the wrapper is thin and the replacement cost is low.
 */
import { ControlSlider } from '@hakit/components';
import { t } from './theme';

export type SliderProps = {
  /** 0-100. */
  value: number;
  onChange?: (value: number) => void;
  /** Fired when the drag ends -- the only one that should call a service. */
  onChangeApplied?: (value: number) => void;
  disabled?: boolean;
  /** Track height. Defaults to the ADR-0001 primary touch target, 64 px. */
  thickness?: number;
};

export function Slider({ value, onChange, onChangeApplied, disabled, thickness }: SliderProps) {
  // @hakit's ControlSlider has an intrinsic width that ignores its container --
  // it renders ~320px regardless, overflowing any narrower tile. Wrapping it in
  // a constrained box and forcing the inner element to 100% is what keeps it
  // inside a 303px grid tile.
  return (
    <div style={{ width: '100%', overflow: 'hidden', display: 'flex' }}>
      <ControlSlider
        vertical={false}
        value={value}
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
        onChange={onChange}
        onChangeApplied={onChangeApplied}
        style={{ width: '100%', minWidth: 0, flex: 1 }}
      />
    </div>
  );
}
