/**
 * The cameras Placed in `left` or `right`, as one block (#29, variant B of
 * the prototype): one big Feed, and beside it a strip of 16:9 thumbnails of
 * the others, each captioned with its name and status.
 *
 * Which one is big is `bigCamera` (`./feeds`): the camera last tapped, else
 * the first with motion, else the first. Tapping a thumbnail makes it big;
 * tapping the big one does nothing. The choice lives in this component's
 * state, so it resets whenever the Page is opened again -- `PlacementView`
 * keys the block by Page for exactly that.
 *
 * Every camera keeps its place in the DOM, in Placement order, whichever one
 * is big: the grid moves the cells, not React. A Feed that changed position
 * in the tree would be unmounted and mounted again, which closes its session
 * and opens a new one -- seconds of `Connessione…` on the very Feed someone
 * just asked to see bigger.
 */
import { useState } from 'react';
import { cameraMoving, useEntities, useFeed, type Entity } from '../ha';
import { FeedCaption, FeedFrame } from './Feed';
import { bigCamera, feedPhase } from './feeds';
import { isPhone } from './device';
import { t } from './theme';

export type FeedsProps = {
  /** The cameras Placed in this Region, in Placement order. */
  cameras: Entity[];
};

export function Feeds({ cameras }: FeedsProps) {
  const entities = useEntities();
  const [tapped, setTapped] = useState<string | null>(null);

  const moving = new Map(cameras.map(c => [c.id, cameraMoving(c, entities.values())]));
  const big = bigCamera(
    cameras.map(c => ({ id: c.id, moving: moving.get(c.id) ?? false })),
    tapped
  );
  const strip = cameras.filter(c => c.id !== big);
  const n = cameras.length;

  // On a phone the strip goes under the big Feed, two thumbnails a line: a
  // 300 px strip beside it would leave the big one a sliver (ADR-0011).
  if (isPhone) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: t.space.sm, rowGap: t.space.md }}>
        {[...cameras.filter(c => c.id === big), ...strip].map(camera => {
          const isBig = camera.id === big;
          return (
            <FeedCell
              key={camera.id}
              camera={camera}
              moving={moving.get(camera.id) ?? false}
              big={isBig}
              onTap={isBig ? undefined : () => setTapped(camera.id)}
              place={isBig ? { gridColumn: '1 / -1' } : {}}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        // With one camera there is no strip: the big Feed takes the width.
        gridTemplateColumns: n > 1 ? `minmax(0, 1fr) ${t.layout.feedThumbW}px` : 'minmax(0, 1fr)',
        // A row per thumbnail, then one that takes the rest, so the strip
        // stacks from the top while the big Feed spans the whole height.
        gridTemplateRows: n > 1 ? `repeat(${n - 1}, auto) minmax(0, 1fr)` : 'minmax(0, 1fr)',
        columnGap: t.space.lg,
        rowGap: t.space.md,
      }}
    >
      {cameras.map(camera => {
        const isBig = camera.id === big;
        return (
          <FeedCell
            key={camera.id}
            camera={camera}
            moving={moving.get(camera.id) ?? false}
            big={isBig}
            onTap={isBig ? undefined : () => setTapped(camera.id)}
            place={isBig ? { gridColumn: 1, gridRow: `1 / span ${n}` } : { gridColumn: 2, gridRow: strip.indexOf(camera) + 1 }}
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
  /** Absent on the big Feed, which does nothing when tapped. */
  onTap?: () => void;
  place: React.CSSProperties;
};

function FeedCell({ camera, moving, big, onTap, place }: FeedCellProps) {
  // An Unavailable camera is a Fault: it never plays and never retries.
  const feed = useFeed(camera.unavailable ? null : camera.id);

  return (
    <div
      {...(onTap
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-label': `Mostra ${camera.name}`,
            onClick: onTap,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onTap();
              }
            },
          }
        : {})}
      style={{ ...place, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', cursor: onTap ? 'pointer' : 'default' }}
    >
      <FeedFrame camera={camera} feed={feed} size={big ? 'big' : 'thumb'} />
      <FeedCaption camera={camera} phase={feedPhase(camera, feed)} moving={moving} big={big} />
    </div>
  );
}
