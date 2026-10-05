/**
 * The status bar's chips (#44): Casa Panel's StatusChip, one per report
 * `statusChips` decides -- a Fault, an open way in, the cameras, the alarm,
 * in that order, each only when there is one to show.
 *
 * An earlier version turned the *entire* glance surface red the moment a
 * single light went Unavailable (CONTEXT.md) -- one unreachable bulb should
 * not read as "the house is on fire". That is disproportionate. Variant D
 * (#6) replaced the flood with a chip, and Casa Panel keeps it: the Fault
 * chip is the only one in the `alert` tone, so it stays unmissable at 2 m,
 * but it is proportionate -- a pill, not the whole sidebar. Every other chip
 * is neutral, whatever it says.
 *
 * A fault does not silence an open gate: `statusChips` reads the verdict
 * and every entry in `report.also`, and the gate keeps its own chip. Lit
 * zones are not a chip any more; the lights StatCard states them.
 *
 * Every chip that leads somewhere can be tapped (#30). A Concern chip opens
 * a Concern list of the entities behind that one Concern (`ConcernList`);
 * the camera chip opens the Page of its cameras' Feeds (Derived), and with
 * no such Page is not a control and does not look like one; the alarm chip
 * opens @hakit's entity Modal for the alarm, where arming and disarming
 * happen. None adds a chevron: the chip is the affordance.
 *
 * The list is this row's own state, not a Popup's and not a Page's: only
 * the panel that was tapped shows it. It follows the live report while open
 * and closes when its Concern clears. `GlanceView` keys this component on
 * the current Page, so leaving the Page -- the idle return, a Tab change on
 * a phone, navigation from a Popup -- closes it too.
 */
import { useState } from 'react';
import type { Entity, HealthLevel, HouseReport } from '../ha';
import { ConcernList } from './ConcernList';
import { liveConcern } from './concernList';
import { AlarmModal } from './AlarmModal';
import { Icon } from './Icon';
import { pressable } from './pressable';
import { statusChips, type StatusChip } from './statusChips';
import { t } from './theme';

export type ChipRowProps = {
  report: HouseReport;
  /** The cameras Placed in `glance`; none, and there is no camera chip. */
  cameras: Entity[];
  /** Those of them whose device reports motion right now. */
  moving: Entity[];
  /** Opens the Page of the cameras' Feeds; absent when there is none. */
  onOpenCameras?: () => void;
  /** The alarm panel entity, or null when the house has none. */
  alarm: Entity | null;
};

/** Casa Panel's gap between two chips, and between a chip's icon and its words. */
const CHIP_GAP = 10;

export function ChipRow({ report, cameras, moving, onOpenCameras, alarm }: ChipRowProps) {
  const chips = statusChips({ report, cameras, moving, alarm });
  const [openLevel, setOpenLevel] = useState<HealthLevel | null>(null);
  const [alarmOpen, setAlarmOpen] = useState(false);

  // The list follows the report while open, and closes for good once its
  // Concern clears: it does not come back by itself if the Concern returns.
  // Set during render, React's way to adjust state to a changed prop.
  const concern = openLevel === null ? null : liveConcern(report, openLevel);
  if (openLevel !== null && concern === null) setOpenLevel(null);

  const onPress = (chip: StatusChip): (() => void) | undefined => {
    const opens = chip.opens;
    if (opens.kind === 'concern') return () => setOpenLevel(opens.level);
    if (opens.kind === 'alarm') return () => setAlarmOpen(true);
    return onOpenCameras;
  };

  return (
    // One line, in the status bar (#41), never capped (#44).
    //
    // The row was once freely `flexWrap: 'wrap'`, which made it the one
    // element in the left column whose height was a function of *house
    // state*: a third concern wrapped it and pushed everything below it down,
    // so no fit could be proven at build time. ADR-0007 bounded it to one
    // line; a later pass let it wrap inside a fixed two-line box, which the
    // left column could afford. The status bar is one line tall, so the row
    // is one line again, and its height is still not house state's to move.
    //
    // All four chips fit beside the Clock at 1280 (`npm run measure`
    // asserts it, with the longest date and each chip's longest wording).
    // Past that -- a house whose words run longer -- what yields is
    // horizontal: the row scrolls sideways, and that is safe because of the
    // ordering. The Fault leads, so the chip scrolled out of view is always
    // the least urgent one. `scrollSnapType` with `scrollSnapAlign` per chip
    // keeps the row resting on whole chips once it is scrolled.
    <>
      <div
        style={{
          display: 'flex',
          gap: CHIP_GAP,
          minWidth: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          // Fully Kiosk hides scrollbars anyway, and the snapping says there is more.
          scrollbarWidth: 'none',
        }}
      >
        {chips.map(chip => (
          <Chip key={chip.key} chip={chip} onPress={onPress(chip)} />
        ))}
      </div>
      {concern && <ConcernList concern={concern} onClose={() => setOpenLevel(null)} />}
      {alarm && <AlarmModal alarm={alarm} open={alarmOpen} onClose={() => setAlarmOpen(false)} />}
    </>
  );
}

/** Casa Panel's StatusChip (`cp-chip`): `target-min` tall, a pill, in its tone. */
function Chip({ chip, onPress }: { chip: StatusChip; onPress?: () => void }) {
  const alert = chip.tone === 'alert';
  const press = pressable(onPress);
  return (
    <div
      {...press}
      style={{
        boxSizing: 'border-box',
        height: t.size.targetMin,
        padding: `0 20px 0 ${t.space[4]}px`,
        borderRadius: t.radius.pill,
        display: 'inline-flex',
        alignItems: 'center',
        gap: CHIP_GAP,
        fontSize: t.type.body.size,
        background: alert ? t.color.alertSurface : t.color.surface,
        border: `1px solid ${alert ? t.color.alertLine : t.color.lineStrong}`,
        color: alert ? t.color.alert : t.color.inkSoft,
        fontWeight: alert ? 500 : 400,
        // A chip holds its width and keeps its text on one line: what
        // scrolls is the row, never the inside of a chip.
        flex: '0 0 auto',
        whiteSpace: 'nowrap',
        scrollSnapAlign: 'start',
        ...press.style,
      }}
    >
      <Icon name={chip.icon} size={22} />
      {chip.text}
    </div>
  );
}
