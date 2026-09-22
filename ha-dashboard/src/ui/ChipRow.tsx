/**
 * The house's concerns (`HouseReport`, src/ha/health.ts) as a row of outline
 * chips, plus the alarm's own state.
 *
 * An earlier version turned the *entire* glance surface red the moment a
 * single light went Unavailable (CONTEXT.md) -- one unreachable bulb should
 * not read as "the house is on fire". That is disproportionate. Variant D
 * (#6) replaced the flood with a chip: a `fault`-level chip is still the
 * only warm-red thing anywhere on the panel, so it stays unmissable at 2 m,
 * but it is proportionate -- a small badge, not the whole sidebar.
 *
 * `HouseReport.verdict` leads (worst concern first, per health.ts), then
 * every entry in `report.also` gets its own chip. Dropping `also` once a
 * fault chip is showing would mean a fault silences an open gate -- exactly
 * the kind of thing someone standing at the door needs to still see on the
 * way out, so every concern keeps its own chip regardless of the verdict's
 * level.
 */
import type { Entity, Health, HouseReport } from '../ha';
import { Icon } from './Icon';
import { alarmIcon } from './alarmState';
import { stateLabel } from './stateLabel';
import { t } from './theme';

export type ChipRowProps = {
  report: HouseReport;
  /** The alarm panel entity, or null when the house has none. */
  alarm: Entity | null;
};

/** Icon per concern level. `Health.headline` already carries the wording. */
const LEVEL_ICON: Record<Health['level'], string> = {
  fault: 'mdi:alert-circle',
  open: 'mdi:door-open',
  on: 'mdi:lightbulb-on',
  ok: 'mdi:check-circle',
};

export function ChipRow({ report, alarm }: ChipRowProps) {
  const concerns = [report.verdict, ...report.also];
  return (
    <div style={{ display: 'flex', gap: t.space.sm, flexWrap: 'wrap' }}>
      {concerns.map((health, i) => (
        <Chip key={i} health={health} />
      ))}
      {alarm && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: t.space.sm,
            padding: `${t.space.sm}px ${t.space.md}px`,
            borderRadius: t.radius.pill,
            border: `1px solid ${t.color.border}`,
            color: t.color.textSecondary,
            fontSize: t.font.body,
          }}
        >
          <Icon name={alarmIcon(alarm)} size={20} />
          {stateLabel(alarm)}
        </div>
      )}
    </div>
  );
}

function Chip({ health }: { health: Health }) {
  const fault = health.level === 'fault';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space.sm,
        padding: `${t.space.sm}px ${t.space.md}px`,
        borderRadius: t.radius.pill,
        border: fault ? `2px solid ${t.color.fault}` : `1px solid ${t.color.border}`,
        color: fault ? t.color.fault : t.color.textSecondary,
        fontSize: t.font.body,
        fontWeight: fault ? 700 : 400,
      }}
    >
      <Icon name={LEVEL_ICON[health.level]} size={20} />
      {health.headline}
    </div>
  );
}
