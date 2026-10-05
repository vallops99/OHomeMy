/**
 * The Clock (#41, CONTEXT.md): the time and the date at the top left of every
 * Page, supplied by the renderer. Not an entity, not Placed, not a control --
 * nothing here can be tapped. A Popup has none.
 *
 * Laid out as the design system's Dashboard has it: the time in `clock`, the
 * date beside it on the same baseline in `bodyLg`, muted.
 */
import { useEffect, useState } from 'react';
import { clockText, msToNextMinute } from './clock';
import { t } from './theme';

/** The current time, re-read on every turn of the minute. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    // A chain of timeouts rather than an interval: each one is re-aimed at
    // the next minute, so the Clock never drifts off it.
    const id = setTimeout(() => setNow(new Date()), msToNextMinute(new Date()));
    return () => clearTimeout(id);
  }, [now]);
  return now;
}

export function Clock() {
  const { time, date } = clockText(useNow());
  const clock = t.type.clock;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: t.space.md, minWidth: 0, whiteSpace: 'nowrap' }}>
      <time
        style={{
          fontSize: clock.size,
          lineHeight: clock.lineHeight,
          fontWeight: clock.weight,
          letterSpacing: clock.letterSpacing,
          fontVariantNumeric: 'tabular-nums',
          color: t.color.ink,
        }}
      >
        {time}
      </time>
      <span style={{ fontSize: t.type.bodyLg.size, lineHeight: t.type.bodyLg.lineHeight, color: t.color.inkMuted }}>{date}</span>
    </div>
  );
}
