/**
 * What a Feed's caption says (#53, from `ui/feeds.ts`), and every other word
 * the Camera Wall says, in one place. English until the strings module
 * (#59). Which Feed is big is still `ui/feeds.ts`'s `bigCamera`.
 *
 * No React, no @hakit: `status.test.ts` runs it under plain Node.
 */
import type { FeedPhase } from '../../ui/feeds';

export const STRINGS = {
  unavailable: 'Unavailable',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  motion: 'Motion',
  live: 'Live',
  noVideo: 'No video',
  noLiveVideo: 'No live video',
  retryIn: (s: number) => `Trying again in ${s} s`,
  retry: 'Try again',
  show: (name: string) => `Show ${name}`,
};

/** `quiet` is secondary ink, `motion` the accent, `fault` the alert. */
export type StatusTone = 'quiet' | 'motion' | 'fault';

/**
 * The right half of a caption. Motion is said only when there is a picture
 * to look at, or no picture will ever come (a camera with no live stream
 * still has a motion sensor worth hearing from): over "Connecting…" it would
 * hide that the picture is missing, and a Fault outranks it.
 */
export function feedStatus(phase: FeedPhase, moving: boolean): { text: string; tone: StatusTone } {
  if (phase === 'unavailable') return { text: STRINGS.unavailable, tone: 'fault' };
  if (phase === 'connecting') return { text: STRINGS.connecting, tone: 'quiet' };
  if (phase === 'failed') return { text: STRINGS.reconnecting, tone: 'quiet' };
  if (moving) return { text: STRINGS.motion, tone: 'motion' };
  return phase === 'live' ? { text: STRINGS.live, tone: 'quiet' } : { text: STRINGS.noVideo, tone: 'quiet' };
}
