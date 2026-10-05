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

/**
 * The chip box's height: whole lines, plus the gaps between them.
 *
 * Derived from the tokens rather than written as a number, so the box and
 * the line height cannot drift apart -- the same failure `gateSlab` had
 * (ADR-0007), where a component computed locally what a token claimed to
 * own. `scripts/measure-panel.ts` asserts the column against this same
 * arithmetic.
 */
const CHIP_BOX_H = t.layout.chipRowFloor * t.layout.chipRowLines + t.space.sm * (t.layout.chipRowLines - 1);

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
    // Wraps, inside a box of fixed height (`chipRowLines` x `chipRowFloor`,
    // plus the gap between the lines).
    //
    // Both halves of that matter, and the history is why. The row was once
    // freely `flexWrap: 'wrap'`, which made it the one element in the left
    // column whose height was a function of *house state*: a third concern
    // wrapped it and pushed everything below it down, so no fit could be
    // proven at build time. ADR-0007 fixed that by banning the wrap outright
    // -- one line, `overflowX: auto` -- which held the height constant but
    // spent a whole second line of room the column now has.
    //
    // The box is the third option: chips wrap as they like *within* a height
    // that house state cannot change. The column's fit is still provable
    // (the box is a constant, asserted in `scripts/measure-panel.ts`) and a
    // third concern is now simply visible rather than scrolled to.
    //
    // What yields is the same as before and for the same reason: chips past
    // the box's capacity are reached by scrolling, and they are always the
    // least urgent ones, because `report.verdict` leads -- worst concern
    // first (health.ts, ADR-0004's `fault > open > lit > ok`). The fault
    // chip, the one that exists to be unmissable at 2 m, is never the one
    // that goes.
    //
    // The scroll is vertical now, not horizontal, because that is the axis
    // the wrap overflows along; `scrollSnapType: 'y mandatory'` with
    // `scrollSnapAlign` per chip keeps the row resting on whole lines, so a
    // chip is either fully readable or fully scrolled to, never sliced in
    // half across the box's edge.
    <>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: t.space.sm,
          alignContent: 'flex-start',
          flex: `0 0 ${CHIP_BOX_H}px`,
          height: CHIP_BOX_H,
          overflowX: 'hidden',
          overflowY: 'auto',
          scrollSnapType: 'y mandatory',
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
              // wraps is the row, never the inside of a chip.
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
        // See the row above: chips hold their size and wrap as whole
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
