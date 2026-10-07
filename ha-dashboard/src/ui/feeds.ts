/**
 * The camera Page's pure half (#29): which Feed is big, and what a Feed's
 * caption says. No React and no @hakit, so `feeds.test.ts` runs it under
 * plain Node; `Feeds.tsx` and `Feed.tsx` render what this decides.
 */
import type { Entity, Feed } from '../ha';
import { tr } from '../i18n';
import { v } from './vars';

/**
 * Where a Feed is, as the caption and the frame need it: the session's phase
 * (`useFeed`), or `unavailable` for a camera that is a Fault and so never
 * opens one.
 */
export type FeedPhase = 'connecting' | 'live' | 'failed' | 'unsupported' | 'unavailable';

/** Where a Feed is. An Unavailable camera is a Fault and has no session. */
export const feedPhase = (camera: Entity, feed: Feed): FeedPhase => (camera.unavailable ? 'unavailable' : feed.session.phase);

/**
 * The big Feed: the camera last tapped, while it is still here. Until one is
 * tapped, the first camera with motion -- the one someone at the panel most
 * likely wants -- and otherwise the first in Placement order.
 */
export function bigCamera(cameras: { id: string; moving: boolean }[], tapped: string | null): string | null {
  const chosen = cameras.find(c => c.id === tapped) ?? cameras.find(c => c.moving) ?? cameras[0];
  return chosen?.id ?? null;
}

/** `motion` is `activeStrong` and `fault` is `fault`; `quiet` is secondary text. */
export type StatusTone = 'quiet' | 'motion' | 'fault';

/** The colour of each status tone, for the caption and the Popup's header alike. */
export const TONE_COLOR = { quiet: v.color.inkMuted, motion: v.color.accent, fault: v.color.alert } as const;

/**
 * The right half of a caption. Motion is said only when there is a picture to
 * look at, or no picture will ever come (a camera with no live stream still
 * has a motion sensor worth hearing from): over `Connessione…` or
 * `Riconnessione…` it would hide that the picture is missing, and a Fault
 * outranks it.
 */
export function feedStatus(phase: FeedPhase, moving: boolean): { text: string; tone: StatusTone } {
  if (phase === 'unavailable') return { text: tr('camera.unavailable'), tone: 'fault' };
  if (phase === 'connecting') return { text: tr('camera.connecting'), tone: 'quiet' };
  if (phase === 'failed') return { text: tr('camera.reconnecting'), tone: 'quiet' };
  if (moving) return { text: tr('camera.motion'), tone: 'motion' };
  return phase === 'live' ? { text: tr('camera.live'), tone: 'quiet' } : { text: tr('camera.noVideo'), tone: 'quiet' };
}

/** Whole seconds until `retryAt`, rounded up, for "Nuovo tentativo tra N s". */
export function secondsLeft(retryAt: number, now: number): number {
  return Math.max(0, Math.ceil((retryAt - now) / 1000));
}
