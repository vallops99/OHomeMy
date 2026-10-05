/**
 * The Clock's pure half (#41, CONTEXT.md "Clock"): the time and the date as
 * the status bar writes them, in Italian, and when it next has to change.
 *
 * No React, so `clock.test.ts` runs it under plain Node. `Clock.tsx` renders
 * it and keeps it current.
 */

const TIME = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false });
const DATE = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * `09:04` and `Lunedì 5 ottobre`, in the panel's own time zone. Italian
 * writes the weekday in lower case; it starts the line here, so it is
 * capitalised, as the design system's Dashboard does.
 */
export function clockText(now: Date): { time: string; date: string } {
  const date = DATE.format(now);
  return { time: TIME.format(now), date: date.charAt(0).toUpperCase() + date.slice(1) };
}

/**
 * How long until the minute turns over. The Clock shows no seconds, so it
 * wakes once a minute, on the minute, rather than polling and lagging up to
 * a poll behind.
 */
export function msToNextMinute(now: Date): number {
  return 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
}
