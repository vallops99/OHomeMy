/**
 * The Camera Wall Widget (#53): `ui/Feeds` and `ui/Feed`, laid out by the
 * Widget's box and coloured through the theme's custom properties.
 *
 * Every camera keeps its place in the DOM, in the order chosen, whichever
 * one is big: the grid moves the cells, not React. A Feed that changed
 * position in the tree would be unmounted and mounted again, which closes
 * its session and opens a new one: seconds of "Connecting…" on the very
 * Feed someone just asked to see bigger. So each cell is told its place
 * through custom properties (`--ohm-cw-strip`), and the kind's CSS decides
 * what the place means in a wide box and in a narrow one.
 *
 * The `<video>` is mounted from the start and shown once it has a frame,
 * so the browser decodes behind the placeholder. It is `muted` and
 * `playsInline`, so it autoplays with no gesture, which is the only way a
 * wall panel ever plays anything. Nothing here opens @hakit's dialog: a Feed
 * is a picture, not a control.
 */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { cameraMoving, useEntities, useFeed, type Entity, type Feed } from '../../ha';
import { tr } from '../../i18n';
import { bigCamera, feedPhase, secondsLeft, type FeedPhase } from '../../ui/feeds';
import { Icon } from '../../ui/Icon';
import type { WidgetProps } from '../types';
import type { cameraWallSchema } from './schema';
import { feedStatus } from './status';

export function CameraWallWidget({ settings }: WidgetProps<(typeof cameraWallSchema)['settings']>) {
  const entities = useEntities();
  // Unmounted when the Page is left, so the choice starts over when it is opened again.
  const [tapped, setTapped] = useState<string | null>(null);

  const cameras = settings.cameras.flatMap(id => entities.get(id) ?? []);
  const moving = new Map(cameras.map(c => [c.id, cameraMoving(c, entities.values())]));
  const big = bigCamera(
    cameras.map(c => ({ id: c.id, moving: moving.get(c.id) ?? false })),
    tapped
  );
  const strip = cameras.filter(c => c.id !== big);
  if (cameras.length === 0) return null;

  return (
    <div className='ohm-camera_wall' data-single={cameras.length === 1} style={{ '--ohm-cw-thumbs': strip.length } as CSSProperties}>
      {cameras.map(camera => {
        const isBig = camera.id === big;
        return (
          <FeedCell
            key={camera.id}
            camera={camera}
            moving={moving.get(camera.id) ?? false}
            big={isBig}
            stripIndex={isBig ? null : strip.indexOf(camera)}
            onTap={isBig ? undefined : () => setTapped(camera.id)}
          />
        );
      })}
    </div>
  );
}

type FeedCellProps = {
  camera: Entity;
  moving: boolean;
  big: boolean;
  /** Its place in the strip, from 0; `null` for the big one. */
  stripIndex: number | null;
  /** Absent on the big Feed, which does nothing when tapped. */
  onTap?: () => void;
};

function FeedCell({ camera, moving, big, stripIndex, onTap }: FeedCellProps) {
  // An Unavailable camera is a Fault: it never plays and never retries.
  const feed = useFeed(camera.unavailable ? null : camera.id);
  const phase = feedPhase(camera, feed);
  const status = feedStatus(phase, moving);

  const press = onTap
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-label': tr('camera.show', { name: camera.name }),
        onClick: onTap,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTap();
          }
        },
      }
    : {};

  return (
    <div
      {...press}
      className='ohm-camera_wall-cell'
      data-big={big}
      style={stripIndex === null ? undefined : ({ '--ohm-cw-strip': stripIndex + 1 } as CSSProperties)}
    >
      <FeedFrame feed={feed} phase={phase} big={big} />
      <div className='ohm-camera_wall-caption' data-phase={phase}>
        <span className='ohm-camera_wall-name' dir='auto'>
          {camera.name}
        </span>
        <span className='ohm-camera_wall-status' data-tone={status.tone}>
          {status.text}
        </span>
      </div>
    </div>
  );
}

function FeedFrame({ feed, phase, big }: { feed: Feed; phase: FeedPhase; big: boolean }) {
  const stream = feed.session.phase === 'connecting' || feed.session.phase === 'live' ? feed.session.stream : null;
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (el !== null && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);

  return (
    <div className='ohm-camera_wall-frame' data-phase={phase}>
      {phase !== 'unavailable' && (
        <video
          ref={video}
          className='ohm-camera_wall-video'
          data-live={phase === 'live'}
          autoPlay
          muted
          playsInline
          onLoadedData={feed.onFirstFrame}
          onPlaying={feed.onFirstFrame}
        />
      )}
      {phase !== 'live' && <FeedState phase={phase} feed={feed} big={big} />}
    </div>
  );
}

const STATE_ICON: Record<Exclude<FeedPhase, 'live'>, string> = {
  unavailable: 'mdi:cctv-off',
  failed: 'mdi:reload-alert',
  unsupported: 'mdi:video-off-outline',
  connecting: 'mdi:cctv',
};

/**
 * Everything a Feed shows in place of its picture. A thumbnail shows only
 * the icon: its caption says the rest, and tapping it makes it big, where
 * the words and the retry button are.
 */
function FeedState({ phase, feed, big }: { phase: Exclude<FeedPhase, 'live'>; feed: Feed; big: boolean }) {
  return (
    <div className='ohm-camera_wall-state' data-phase={phase}>
      <span className='ohm-camera_wall-state-icon'>
        <Icon name={STATE_ICON[phase]} size={big ? 56 : 28} />
      </span>
      {big && phase === 'failed' && feed.session.phase === 'failed' && <Retry retryAt={feed.session.retryAt} onRetry={feed.retry} />}
      {big && phase === 'unsupported' && <span>{tr('camera.noLiveVideo')}</span>}
      {big && phase === 'unavailable' && <span className='ohm-camera_wall-state-fault'>{tr('camera.unavailable')}</span>}
    </div>
  );
}

/** "Trying again in N s", counting down, and the button that does not wait. */
function Retry({ retryAt, onRetry }: { retryAt: number; onRetry: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, []);

  return (
    <>
      <span>{tr('camera.retryIn', { seconds: secondsLeft(retryAt, now) })}</span>
      <button type='button' className='ohm-camera_wall-retry' onClick={onRetry}>
        <Icon name='mdi:reload' size={24} />
        {tr('camera.retry')}
      </button>
    </>
  );
}
