/**
 * Two glance stats beneath the Hero: how many Areas are lit, and how hard
 * the house is drawing right now. Variant D (#6) draws these as bare value
 * over caption, side by side -- no card, matching the Hero's borderlessness.
 */
import { pressable } from './pressable';
import { t } from './theme';

export type StatsProps = {
  /** How many Areas have their `main` light on. */
  lightsOn: number;
  /** Instantaneous house draw in watts, or null when no power sensor reports one. */
  watts: number | null;
  /**
   * Opens the Page where the power `sensor` feeding the consumption is
   * Placed (#32); absent when there is none, and then this is not a control.
   */
  onOpen?: () => void;
};

export function Stats({ lightsOn, watts, onOpen }: StatsProps) {
  const press = pressable(onOpen);
  return (
    <div {...press} style={{ display: 'flex', gap: t.space.xl, ...press.style }}>
      <Stat value={String(lightsOn)} label='luci accese' />
      {/*
       * The house has no power sensor in some configurations (CONTEXT.md:
       * the dashboard is backend-driven and renders only what the registry
       * reports). A dash or a fake "0 W" here would claim a reading that
       * does not exist, so when `watts` is null this stat renders nothing
       * at all rather than a placeholder -- the panel stays quiet instead
       * of lying about consumption it cannot see.
       */}
      {watts != null && <Stat value={String(watts)} unit='W' label='consumo' />}
    </div>
  );
}

function Stat({ value, label, unit }: { value: string; label: string; unit?: string }) {
  return (
    <div>
      <div style={{ fontSize: t.font.glanceL, fontWeight: 600, color: t.color.textPrimary }}>
        {value}
        {unit && <span style={{ fontSize: t.font.body, color: t.color.textSecondary }}> {unit}</span>}
      </div>
      <div style={{ fontSize: t.font.caption, color: t.color.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  );
}
