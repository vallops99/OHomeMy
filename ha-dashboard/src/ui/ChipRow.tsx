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
 *
 * Every chip can be tapped (#30). A Concern chip opens a Concern list of
 * the entities behind that one Concern (`ConcernList`), and the alarm chip
 * opens @hakit's entity Modal for the alarm, where arming and disarming
 * happen. Neither adds anything to the chip's look -- no chevron, no
 * affordance -- so the fixed box below is exactly as it was.
 *
 * The list is this row's own state, not a Popup's and not a Page's: only
 * the panel that was tapped shows it. It follows the live report while open
 * and closes when its Concern clears. `GlanceView` keys this component on
 * the current Page, so leaving the Page -- the idle return, a Tab change on
 * a phone, navigation from a Popup -- closes it too.
 */
import { useState, type KeyboardEvent } from 'react';
import type { Entity, Health, HealthLevel, HouseReport } from '../ha';
import { ConcernList } from './ConcernList';
import { liveConcern } from './concernList';
import { AlarmModal } from './AlarmModal';
import { Icon } from './Icon';
import { alarmIcon } from './alarmState';
import { LEVEL_ICON } from './levelIcon';
import { stateLabel } from './stateLabel';
import { t } from './theme';

export type ChipRowProps = {
  report: HouseReport;
  /** The alarm panel entity, or null when the house has none. */
  alarm: Entity | null;
};

/** A chip's tap, for a pointer or a keyboard, with nothing changed about how it looks. */
const pressable = (onPress: () => void) => ({
  role: 'button',
  tabIndex: 0,
  onClick: onPress,
  onKeyDown: (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPress();
    }
  },
});

export function ChipRow({ report, alarm }: ChipRowProps) {
  const concerns = [report.verdict, ...report.also];
  const [openLevel, setOpenLevel] = useState<HealthLevel | null>(null);
  const [alarmOpen, setAlarmOpen] = useState(false);

  // The list follows the report while open, and closes for good once its
  // Concern clears: it does not come back by itself if the Concern returns.
  // Set during render, React's way to adjust state to a changed prop.
  const concern = openLevel === null ? null : liveConcern(report, openLevel);
  if (openLevel !== null && concern === null) setOpenLevel(null);

  return (
    // One line, in the status bar (#41), scrolling sideways past what fits.
    //
    // The row was once freely `flexWrap: 'wrap'`, which made it the one
    // element in the left column whose height was a function of *house
    // state*: a third concern wrapped it and pushed everything below it down,
    // so no fit could be proven at build time. ADR-0007 bounded it to one
    // line; a later pass let it wrap inside a fixed two-line box, which the
    // left column could afford. The status bar is one line tall, so the row
    // is one line again, and its height is still not house state's to move.
    //
    // What yields is horizontal, and that is safe because of the ordering:
    // `report.verdict` leads -- worst concern first (health.ts, ADR-0004's
    // `fault > open > lit > ok`) -- so the chip scrolled out of view is
    // always the least urgent one. The fault chip, the one that exists to be
    // unmissable at 2 m, is never the one that goes. `scrollSnapType` with
    // `scrollSnapAlign` per chip keeps the row resting on whole chips, never
    // one sliced across the edge.
    <>
      <div
        style={{
          display: 'flex',
          gap: t.space.sm,
          minWidth: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          // Fully Kiosk hides scrollbars anyway, and the snapping says there is more.
          scrollbarWidth: 'none',
        }}
      >
        {concerns.map((health, i) => (
          <Chip
            key={i}
            health={health}
            onPress={
              // `ok` is a chip too, but not a Concern: it has nothing behind it to list.
              health.level === 'ok' ? undefined : () => setOpenLevel(health.level)
            }
          />
        ))}
        {alarm && (
          <div
            {...pressable(() => setAlarmOpen(true))}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: t.space.sm,
              padding: `${t.space.sm}px ${t.space.md}px`,
              borderRadius: t.radius.pill,
              border: `1px solid ${t.color.border}`,
              color: t.color.textSecondary,
              fontSize: t.font.body,
              // A chip holds its width and keeps its text on one line: what
              // scrolls is the row, never the inside of a chip.
              flex: '0 0 auto',
              whiteSpace: 'nowrap',
              scrollSnapAlign: 'start',
              cursor: 'pointer',
            }}
          >
            <Icon name={alarmIcon(alarm)} size={20} />
            {stateLabel(alarm)}
          </div>
        )}
      </div>
      {concern && <ConcernList concern={concern} onClose={() => setOpenLevel(null)} />}
      {alarm && <AlarmModal alarm={alarm} open={alarmOpen} onClose={() => setAlarmOpen(false)} />}
    </>
  );
}

function Chip({ health, onPress }: { health: Health; onPress?: () => void }) {
  const fault = health.level === 'fault';
  return (
    <div
      {...(onPress ? pressable(onPress) : {})}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space.sm,
        padding: `${t.space.sm}px ${t.space.md}px`,
        borderRadius: t.radius.pill,
        border: fault ? `2px solid ${t.color.faultLine}` : `1px solid ${t.color.border}`,
        color: fault ? t.color.fault : t.color.textSecondary,
        fontSize: t.font.body,
        fontWeight: fault ? 700 : 400,
        // See the row above: chips hold their size and scroll as whole
        // units, snapping per chip.
        flex: '0 0 auto',
        whiteSpace: 'nowrap',
        scrollSnapAlign: 'start',
        ...(onPress ? { cursor: 'pointer' } : {}),
      }}
    >
      <Icon name={LEVEL_ICON[health.level]} size={20} />
      {health.headline}
    </div>
  );
}
