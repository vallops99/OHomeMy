/**
 * The media strip: contextual, not persistent (#8).
 *
 * The house has seven media players and they are idle most of the time. A
 * persistent bar would spend most of its life showing "niente in riproduzione"
 * in a panel whose whole premise is that every pixel answers something. So the
 * bar shows whatever is actually playing, and when nothing is, the cell says
 * so quietly in one line rather than rendering a dead transport.
 *
 * Which player it shows is Derived: the first one reporting `playing`, in
 * registry order. Nothing here names an entity id.
 */
import { useActions, type Entity } from '../ha';
import { Icon } from './Icon';
import { Tile } from './Tile';
import { onSurfaceFor, t } from './theme';

export type MediaBarProps = {
  /** Every media player the screen placed here. The playing one wins. */
  entities: Entity[];
};

/** What is worth showing: something actually making sound. */
const playingOf = (entities: Entity[]) => entities.find(e => e.state === 'playing') ?? null;

/** Home Assistant's `media_title`, with the artist when there is one. */
function nowPlaying(entity: Entity): string {
  const title = entity.attributes.media_title as string | undefined;
  const artist = (entity.attributes.media_artist ?? entity.attributes.media_channel) as string | undefined;
  if (title && artist) return `${title} — ${artist}`;
  return title ?? 'In riproduzione';
}

export function MediaBar({ entities }: MediaBarProps) {
  const actions = useActions();
  const playing = playingOf(entities);

  if (!playing) {
    return (
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: t.space.sm,
          padding: `0 ${t.space.lg}px`,
          borderRadius: t.radius.tile,
          background: t.color.surface,
          border: `1px solid ${t.color.border}`,
          color: t.color.textSecondary,
          boxSizing: 'border-box',
        }}
      >
        <Icon name='mdi:music-note-off' size={24} color={t.color.textSecondary} />
        <span style={{ fontSize: t.font.body }}>Niente in riproduzione</span>
      </div>
    );
  }

  const fg = onSurfaceFor({ active: true, strong: true });

  return (
    <Tile entity={playing} active strong alwaysFilled disableModal>
      <div style={{ display: 'flex', alignItems: 'center', gap: t.space.md, height: '100%', color: fg }}>
        <Icon name='mdi:music' size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: t.font.glanceM,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {nowPlaying(playing)}
          </div>
          <div style={{ fontSize: t.font.caption, opacity: 0.85 }}>{playing.name}</div>
        </div>

        {/* Transport controls own their own presses: the tile beneath must not
            also toggle the player when a button is hit. */}
        <div style={{ display: 'flex', gap: t.space.sm, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <MediaButton
            icon='mdi:skip-previous'
            label='Precedente'
            onPress={() => actions.call('media_player', 'media_previous_track', playing.id)}
            fg={fg}
          />
          <MediaButton icon='mdi:pause' label='Pausa' onPress={() => actions.call('media_player', 'media_pause', playing.id)} fg={fg} />
          <MediaButton
            icon='mdi:skip-next'
            label='Successivo'
            onPress={() => actions.call('media_player', 'media_next_track', playing.id)}
            fg={fg}
          />
        </div>
      </div>
    </Tile>
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
        width: t.touch.floor,
        height: t.touch.floor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: t.radius.sm,
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
