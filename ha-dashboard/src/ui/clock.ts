/**
 * The Clock's pure half (#41, CONTEXT.md "Clock"): the time and the date in
 * the viewer's own formats (#59, `i18n/format.ts`), and when it next has to
 * change.
 *
 * No React, so `clock.test.ts` runs it under plain Node. `Clock.tsx` renders
 * it and keeps it current.
 */
import { fmt } from '../i18n';

/**
 * `09:04` and `Lunedì 5 ottobre` for an Italian viewer, `9:04 AM` and
 * `Monday, October 5` for an American one: 12 or 24 hours, the date's
 * language and the time zone as their Home Assistant profile says. The
 * weekday starts the line, so it is capitalised, as the design system's
 * Dashboard does.
 */
export function clockText(now: Date): { time: string; date: string } {
  return { time: fmt.time(now), date: fmt.longDate(now) };
}

/**
 * How long until the minute turns over. The Clock shows no seconds, so it
 * wakes once a minute, on the minute, rather than polling and lagging up to
 * a poll behind.
 */
export function msToNextMinute(now: Date): number {
  return 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
}
