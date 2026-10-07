/**
 * What a Feed's caption says (#53, from `ui/feeds.ts`), in the viewer's
 * language (`camera.*`, #59). Which Feed is big is still `ui/feeds.ts`'s
 * `bigCamera`.
 *
 * No React, no @hakit: `status.test.ts` runs it under plain Node.
 */
import { tr } from '../../i18n';
import type { FeedPhase } from '../../ui/feeds';

/** `quiet` is secondary ink, `motion` the accent, `fault` the alert. */
export type StatusTone = 'quiet' | 'motion' | 'fault';

/**
 * The right half of a caption. Motion is said only when there is a picture
 * to look at, or no picture will ever come (a camera with no live stream
 * still has a motion sensor worth hearing from): over "Connecting…" it would
 * hide that the picture is missing, and a Fault outranks it.
 */
export function feedStatus(phase: FeedPhase, moving: boolean): { text: string; tone: StatusTone } {
  if (phase === 'unavailable') return { text: tr('camera.unavailable'), tone: 'fault' };
  if (phase === 'connecting') return { text: tr('camera.connecting'), tone: 'quiet' };
  if (phase === 'failed') return { text: tr('camera.reconnecting'), tone: 'quiet' };
  if (moving) return { text: tr('camera.motion'), tone: 'motion' };
  return phase === 'live' ? { text: tr('camera.live'), tone: 'quiet' } : { text: tr('camera.noVideo'), tone: 'quiet' };
}
