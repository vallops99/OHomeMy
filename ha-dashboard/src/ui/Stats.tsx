/**
 * Two glance stats beneath the Hero (#44): Casa Panel's StatCards, side by
 * side on a two-column grid -- how many lights are on, and how hard the
 * house is drawing right now.
 *
 * The lights card is where lit zones are said now that they are not a chip
 * (docs/protocol.md "The chips"): its count is `HouseReport.lit`'s, so the
 * card and the Verdict count by the one rule, and its icon takes `accent`
 * while any is on -- colour is state (ADR-0013), and that is this state.
 */
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { pressable } from './pressable';
import { t } from './theme';

export type StatsProps = {
  /** How many lights are on, light by light: the lit Concern's count. */
  lightsOn: number;
  /** Instantaneous house draw in watts, or null when no power sensor reports one. */
  watts: number | null;
  /**
   * Opens the Page where the power `sensor` feeding the consumption is
   * Placed (#32); absent when there is none, and then that card is not a
   * control. The lights card never is: nothing is Placed for it to lead to.
   */
  onOpenPower?: () => void;
};

export function Stats({ lightsOn, watts, onOpenPower }: StatsProps) {
  return (
    // Two columns whether or not the consumption is there, so the lights
    // card keeps its width rather than stretching across the column.
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: t.space[3] }}>
      <StatCard icon='mdi:lightbulb' value={lightsOn} unit='luci accese' active={lightsOn > 0} />
      {/*
       * The house has no power sensor in some configurations (CONTEXT.md:
       * the dashboard is backend-driven and renders only what the registry
       * reports). A dash or a fake "0 W" here would claim a reading that
       * does not exist, so when `watts` is null this card renders nothing
       * at all rather than a placeholder -- the panel stays quiet instead
       * of lying about consumption it cannot see.
       */}
      {watts != null && <StatCard icon='mdi:flash' value={watts} unit='W in uso' onPress={onOpenPower} />}
    </div>
  );
}

type StatCardProps = {
  icon: string;
  value: ReactNode;
  /** Set after the number, in `body` and `ink-muted`: "W in uso". */
  unit: string;
  /** The icon in `accent`, else `ink-muted`. */
  active?: boolean;
  onPress?: () => void;
};

/** Casa Panel's StatCard (`cp-stat`): an icon over one big number and its unit. */
function StatCard({ icon, value, unit, active = false, onPress }: StatCardProps) {
  const press = pressable(onPress);
  const { size, lineHeight, weight, letterSpacing } = t.type.stat;
  return (
    <div
      {...press}
      style={{
        minWidth: 0,
        padding: `${t.space[4]}px ${t.space[5]}px`,
        borderRadius: t.radius.card,
        background: t.color.surface,
        border: `1px solid ${t.color.line}`,
        display: 'flex',
        flexDirection: 'column',
        gap: t.space[2],
        color: active ? t.color.accent : t.color.inkMuted,
        ...press.style,
      }}
    >
      <Icon name={icon} size={22} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0 }}>
        <span
          style={{ fontSize: size, lineHeight, fontWeight: weight, letterSpacing, color: t.color.ink, fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: t.type.body.size,
            color: t.color.inkMuted,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}
