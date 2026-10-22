/**
 * The media strip: contextual, not persistent (#8).
 *
 * The house has seven media players and they are idle most of the time. A
 * persistent bar would spend most of its life showing "nothing playing"
 * in a panel whose whole premise is that every pixel answers something. So the
 * bar shows whatever is actually playing, and when nothing is, the cell says
 * so quietly in one line rather than rendering a dead transport.
 *
 * Which player it shows is Derived: the first one reporting `playing`, in
 * registry order. Nothing here names an entity id.
 */
import type { CSSProperties } from 'react';
import { useActions, type Entity } from '../ha';
import { tr } from '../i18n';
import { Icon } from './Icon';
import { mediaControls } from './mediaState';
import { Tile } from './Tile';
import { onSurfaceFor, v } from './vars';

export type MediaBarProps = {
  /** Every media player the screen placed here. The playing one wins. */
  entities: Entity[];
  /** Overrides on the root box: a Widget sizes it to its own (`src/widgets`). */
  style?: CSSProperties;
};

/** What is worth showing: something actually making sound. */
const playingOf = (entities: Entity[]) => entities.find(e => e.state === 'playing') ?? null;

/** Home Assistant's `media_title`, with the artist when there is one. */
function nowPlaying(entity: Entity): string {
  const title = entity.attributes.media_title as string | undefined;
  const artist = (entity.attributes.media_artist ?? entity.attributes.media_channel) as string | undefined;
  if (title && artist) return `${title} — ${artist}`;
  return title ?? tr('media.playing');
}

/**
 * The strip's own box: the width left over, but never under `mediaBarMinW`
 * (tokens.ts) -- below that the footer scrolls rather than crush the
 * transport (#32). At least a touch target tall: in `left` (#35) nothing
 * stretches it the way the footer does.
 */
const box = { flex: 1, minWidth: v.layout.mediaBarMinW, minHeight: v.touch.primary, display: 'flex' } as const;

export function MediaBar({ entities, style }: MediaBarProps) {
  const actions = useActions();
  const playing = playingOf(entities);

  if (!playing) {
    return (
      <div
        style={{
          ...box,
          alignItems: 'center',
          gap: v.space.sm,
          padding: `0 ${v.space.lg}`,
          borderRadius: v.radius.tile,
          background: v.color.surface,
          border: `1px solid ${v.color.line}`,
          color: v.color.inkMuted,
          boxSizing: 'border-box',
          ...style,
        }}
      >
        <Icon name='mdi:music-note-off' size={24} color={v.color.inkMuted} />
        <span style={{ fontSize: v.font.body }}>{tr('media.nothing')}</span>
      </div>
    );
  }

  const fg = onSurfaceFor({ active: true, strong: true });
  // Only what this player can do (#35): a skip button on a player with no
  // skip would be a dead control that looks live.
  const controls = mediaControls(playing);

  return (
    <div style={{ ...box, ...style }}>
      {/*
        `sm` top and bottom, not the tile's `md`: the transport's 44 px
        buttons plus `md` made the strip 74 px, past the 64 px footer (a
        `minHeight`, so content wins), and the footer took 10 px from the
        left column whenever something played (#32).
      */}
      <Tile entity={playing} active strong alwaysFilled disableModal style={{ paddingBlock: v.space.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: v.space.md, height: '100%', color: fg }}>
          <Icon name='mdi:music' size={32} />
          {/*
            `contain: inline-size`: the title's whole nowrap width must not
            count toward the strip's own minimum, or a long title widens the
            strip past the footer and scrolls it instead of ellipsising (#32).
            The strip's floor is `mediaBarMinW`, and nothing else.
          */}
          <div style={{ flex: 1, minWidth: 0, contain: 'inline-size' }}>
            <div
              dir='auto'
              style={{
                fontSize: v.font.glanceM,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {nowPlaying(playing)}
            </div>
            <div dir='auto' style={{ fontSize: v.font.caption, opacity: 0.85 }}>
              {playing.name}
            </div>
          </div>

          {/* Transport controls own their own presses: the tile beneath must not
            also toggle the player when a button is hit. */}
          <div style={{ display: 'flex', gap: v.space.sm, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            {controls.previous && (
              <MediaButton
                icon='mdi:skip-previous'
                label={tr('media.previous')}
                onPress={() => actions.call('media_player', 'media_previous_track', playing.id)}
                fg={fg}
              />
            )}
            {controls.playPause === 'pause' && (
              <MediaButton
                icon='mdi:pause'
                label={tr('media.pause')}
                onPress={() => actions.call('media_player', 'media_pause', playing.id)}
                fg={fg}
              />
            )}
            {controls.next && (
              <MediaButton
                icon='mdi:skip-next'
                label={tr('media.next')}
                onPress={() => actions.call('media_player', 'media_next_track', playing.id)}
                fg={fg}
              />
            )}
          </div>
        </div>
      </Tile>
    </div>
  );
}

/** A transport button at the ADR-0001 touch floor. */
function MediaButton({ icon, label, onPress, fg }: { icon: string; label: string; onPress: () => void; fg: string }) {
  return (
    <button
      type='button'
      aria-label={label}
      onClick={onPress}
      style={{
        width: v.touch.floor,
        height: v.touch.floor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: v.radius.sm,
        border: 'none',
        background: 'transparent',
        color: fg,
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <Icon name={icon} size={28} color={fg} />
    </button>
  );
}
