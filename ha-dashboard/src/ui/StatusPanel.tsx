/**
 * The glance layer: the one thing read on approach (#8).
 *
 * The panel hangs at the entrance and is used while arriving or leaving, so
 * this answers "is the house okay?" as a verdict, not as a list of readings.
 * An earlier version showed the temperature at `glanceXL` with the house's
 * state as a footnote -- which put the least actionable number in the largest
 * type. The verdict leads; temperature and humidity are context beside it.
 *
 * Colour carries the verdict as well as the words, so the state is readable
 * from further away than the text is: a fault turns the whole surface red.
 */
import type { Health, HouseReport } from '../ha';
import { Icon } from './Icon';
import { t } from './theme';

/**
 * How each verdict reads. `fault` uses the fault tokens; `open` uses the
 * accent, because a gate left open is not a malfunction -- it is a thing the
 * owner may have meant, and colouring it as a fault would cry wolf.
 */
const LOOK: Record<Health['level'], { bg: string; fg: string; icon: string }> = {
  fault: { bg: t.color.faultSurface, fg: t.color.fault, icon: 'mdi:alert-circle' },
  open: { bg: t.color.activeStrong, fg: t.color.onActiveStrong, icon: 'mdi:door-open' },
  on: { bg: t.color.surfaceRaised, fg: t.color.textPrimary, icon: 'mdi:lightbulb-on' },
  ok: { bg: t.color.surface, fg: t.color.textPrimary, icon: 'mdi:shield-check' },
};

export type StatusPanelProps = {
  report: HouseReport;
  /** Degrees Celsius, or null when no thermostat reports one. */
  temperature: number | null;
  humidity: number | null;
  colSpan?: number;
  rowSpan?: number;
};

export function StatusPanel({ report, temperature, humidity, colSpan = 1, rowSpan = 1 }: StatusPanelProps) {
  const { verdict, also } = report;
  const look = LOOK[verdict.level];

  return (
    <div
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        display: 'flex',
        alignItems: 'center',
        gap: t.space.lg,
        padding: `0 ${t.space.lg}px`,
        borderRadius: t.radius.tile,
        background: look.bg,
        border: `1px solid ${verdict.level === 'fault' ? t.color.fault : t.color.border}`,
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <Icon name={look.icon} size={56} color={look.fg} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: t.font.glanceL,
            fontWeight: 700,
            color: look.fg,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {verdict.headline}
        </div>
        {verdict.detail && (
          <div
            style={{
              fontSize: t.font.body,
              color: look.fg,
              opacity: 0.8,
              marginTop: t.space.xs,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {verdict.detail}
          </div>
        )}
        {/* A fault outranks an open gate for colour, but must not silence it:
            someone reading "un guasto" and walking away would leave the gate
            open. See `HouseReport` in ha/health.ts. */}
        {also.map(h => (
          <div
            key={h.level}
            style={{
              fontSize: t.font.body,
              color: look.fg,
              opacity: 0.8,
              marginTop: t.space.xs,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {h.headline}
            {h.detail ? ` — ${h.detail}` : ''}
          </div>
        ))}
      </div>

      {/* Readings sit to the side: useful, but not what the panel is for. */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: t.space.xs, flexShrink: 0 }}>
        <span style={{ fontSize: t.font.glanceL, fontWeight: 600, color: look.fg, lineHeight: 1 }}>
          {temperature === null ? '--' : `${temperature.toFixed(1)}°`}
        </span>
        {humidity !== null && <span style={{ fontSize: t.font.body, color: look.fg, opacity: 0.8 }}>{Math.round(humidity)}% umidità</span>}
      </div>
    </div>
  );
}
