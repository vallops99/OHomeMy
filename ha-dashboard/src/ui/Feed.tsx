/**
 * A Feed (CONTEXT.md): a camera as its live picture, over WebRTC (#29).
 *
 * Two pieces rather than one component, because the session and the picture
 * are wanted in different places. `Feeds` puts a `FeedFrame` and a
 * `FeedCaption` together per camera; the Popup puts the frame behind
 * everything and the status in its own header. Both get the session from
 * `useFeed` (`src/ha/useFeed.ts`) and hand it down.
 *
 * The `<video>` is mounted from the start and only shown once it has a
 * frame, so the browser can start decoding behind the placeholder. It is
 * `muted` and `playsInline` so it autoplays with no gesture, which is the
 * only way a wall panel ever plays anything (the research, §2.1). Nothing
 * here opens @hakit's modal: a Feed is a picture, not a control.
 */
import { useEffect, useRef, useState } from 'react';
import type { Entity, Feed } from '../ha';
import { TONE_COLOR, feedPhase, feedStatus, secondsLeft, type FeedPhase } from './feeds';
import { isPhone } from './device';
import { Icon } from './Icon';
import { t } from './theme';

/**
 * `big` is the camera Page's main Feed and `thumb` one of its strip; `full`
 * fills whatever positioned box it is in, edge to edge, as a Popup's
 * background does.
 */
export type FeedSize = 'big' | 'thumb' | 'full';

export type FeedFrameProps = {
  camera: Entity;
  feed: Feed;
  size: FeedSize;
};

export function FeedFrame({ camera, feed, size }: FeedFrameProps) {
  const phase = feedPhase(camera, feed);
  const stream = feed.session.phase === 'connecting' || feed.session.phase === 'live' ? feed.session.stream : null;
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (el !== null && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);

  const fault = phase === 'unavailable';
  const shape: React.CSSProperties =
    size === 'full'
      ? { position: 'absolute', inset: 0 }
      : {
          position: 'relative',
          borderRadius: t.radius.tile,
          border: `1px solid ${fault ? t.color.faultLine : t.color.border}`,
          // A phone's column scrolls, so there is no height to fill: the big Feed takes 16:9 too.
          ...(size === 'big' && !isPhone ? { flex: 1, minHeight: 0 } : { aspectRatio: '16 / 9' }),
        };

  return (
    <div style={{ ...shape, overflow: 'hidden', background: fault ? t.color.faultSurface : t.color.ground }}>
      {!fault && (
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          onLoadedData={feed.onFirstFrame}
          onPlaying={feed.onFirstFrame}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            // The big Feed shows the whole picture; a thumbnail and a
            // Popup's background fill their box and crop.
            objectFit: size === 'big' ? 'contain' : 'cover',
            display: 'block',
            opacity: phase === 'live' ? 1 : 0,
          }}
        />
      )}
      {phase !== 'live' && <FeedState phase={phase} feed={feed} size={size} />}
    </div>
  );
}

/**
 * Everything a Feed shows in place of its picture. A thumbnail shows only
 * the icon: its caption says the rest, and tapping it makes it big, where
 * the words and the Riprova button are.
 */
function FeedState({ phase, feed, size }: { phase: Exclude<FeedPhase, 'live'>; feed: Feed; size: FeedSize }) {
  const small = size === 'thumb';
  const fault = phase === 'unavailable';
  const icon =
    phase === 'unavailable'
      ? 'mdi:cctv-off'
      : phase === 'failed'
        ? 'mdi:reload-alert'
        : phase === 'unsupported'
          ? 'mdi:video-off-outline'
          : 'mdi:cctv';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.space.sm,
        padding: t.space.md,
        textAlign: 'center',
        background: fault ? t.color.faultSurface : t.color.surface,
        color: fault ? t.color.fault : t.color.textSecondary,
      }}
    >
      <div style={{ display: 'flex', animation: phase === 'connecting' ? 'feed-pulse 1.4s ease-in-out infinite' : undefined }}>
        <Icon name={icon} size={small ? 28 : 56} />
      </div>
      {!small && phase === 'failed' && feed.session.phase === 'failed' && <Retry retryAt={feed.session.retryAt} onRetry={feed.retry} />}
      {!small && phase === 'unsupported' && <span style={{ fontSize: t.font.body }}>Nessun video in diretta</span>}
      {!small && phase === 'unavailable' && <span style={{ fontSize: t.font.body, fontWeight: 600 }}>Non disponibile</span>}
    </div>
  );
}

/** "Nuovo tentativo tra N s", counting down, and the button that does not wait. */
function Retry({ retryAt, onRetry }: { retryAt: number; onRetry: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, []);

  return (
    <>
      <span style={{ fontSize: t.font.body }}>Nuovo tentativo tra {secondsLeft(retryAt, now)} s</span>
      <button
        type='button'
        onClick={onRetry}
        style={{
          minHeight: t.touch.primary,
          padding: `0 ${t.space.lg}px`,
          display: 'flex',
          alignItems: 'center',
          gap: t.space.sm,
          borderRadius: t.radius.pill,
          border: `1px solid ${t.color.border}`,
          background: t.color.surfaceRaised,
          color: t.color.textPrimary,
          fontSize: t.font.body,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Icon name='mdi:reload' size={24} />
        Riprova
      </button>
    </>
  );
}

/** The line under a Feed: the camera's name on the left, its status on the right. */
export function FeedCaption({ camera, phase, moving, big }: { camera: Entity; phase: FeedPhase; moving: boolean; big: boolean }) {
  const status = feedStatus(phase, moving);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: t.space.sm,
        padding: `${t.space.xs}px ${t.space.xs}px 0`,
        fontWeight: 600,
        flexShrink: 0,
        // A phone's thumbnails are half its width: the status goes under the
        // name rather than cut every "Telecamera ..." to "Teleca...", the
        // part that says which camera it is.
        ...(isPhone ? { flexWrap: 'wrap', rowGap: 0 } : {}),
      }}
    >
      <span
        style={{
          fontSize: big ? t.font.glanceM : t.font.caption,
          minWidth: 0,
          color: phase === 'unavailable' ? t.color.fault : t.color.textPrimary,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {camera.name}
      </span>
      <span style={{ flexShrink: 0, fontSize: big ? t.font.body : t.font.caption, color: TONE_COLOR[status.tone] }}>{status.text}</span>
    </div>
  );
}
