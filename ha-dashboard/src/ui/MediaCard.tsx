/**
 * A `media_player` in full (#35): what it is in `right`. Its name, the
 * artwork when there is any, what is playing, the transport, the volume, and
 * on/off -- each control only when the player's `supported_features` says it
 * can do it (`mediaControls`). In `left` and `footer` a player is the
 * compact `MediaBar` instead: the Region decides.
 *
 * One row, 64 px of content, so five players stack in `right` at 1280x800.
 * Not a `Tile`: the card is not a control, its buttons and slider are. Off,
 * idle and Unavailable each say so; Unavailable is a Fault.
 */
import type { CSSProperties } from 'react';
import { useActions, useHassUrl, type Entity } from '../ha';
import { tr } from '../i18n';
import { Icon } from './Icon';
import { mediaControls, mediaNowPlaying } from './mediaState';
import { Slider } from './Slider';
import { stateLabel } from './stateLabel';
import { v } from './vars';

export type MediaCardProps = {
  entity: Entity;
  /** Overrides on the root box: a Widget sizes it to its own (`src/widgets`). */
  style?: CSSProperties;
};

/** The artwork's side, and the row's content height. */
const ART = 64;

export function MediaCard({ entity, style }: MediaCardProps) {
  const actions = useActions();
  const hassUrl = useHassUrl();
  const controls = mediaControls(entity);
  const { title, artist } = mediaNowPlaying(entity);
  const unavailable = entity.unavailable;
  const playing = entity.state === 'playing';
  const picture = typeof entity.attributes.entity_picture === 'string' ? entity.attributes.entity_picture : null;
  const media = (service: string, data?: Record<string, unknown>) => actions.call('media_player', service, entity.id, data);

  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        alignItems: 'center',
        // In a narrow box the row folds in two, as a Row's does on a phone
        // (ADR-0011): the artwork and what is playing on one line, the
        // volume and the buttons under it. Its one row sums past a phone's
        // width. A Widget's box sets these custom properties
        // (`src/widgets/media`), and the label-driven Dashboard's page root
        // does on a phone (`HakitTheme`); unset, the row is one line.
        flexWrap: 'var(--ohm-media-wrap, nowrap)' as CSSProperties['flexWrap'],
        gap: v.space.md,
        padding: v.space.md,
        boxSizing: 'border-box',
        borderRadius: v.radius.tile,
        border: `1px solid ${unavailable ? v.color.alertLine : v.color.line}`,
        background: unavailable ? v.color.alertSurface : v.color.surface,
        ...style,
      }}
    >
      <div
        style={{
          width: ART,
          height: ART,
          flexShrink: 0,
          borderRadius: v.radius.sm,
          background: v.color.surfaceWell,
          backgroundImage: picture && !unavailable ? `url("${hassUrl(picture)}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: unavailable ? v.color.alert : playing ? v.color.accent : v.color.inkMuted,
        }}
      >
        {(!picture || unavailable) && <Icon name={unavailable ? 'mdi:alert-circle' : playing ? 'mdi:music' : 'mdi:speaker'} size={32} />}
      </div>

      <div
        style={{
          // Folded, the rest of the first line, so the controls wrap under.
          flex: 'var(--ohm-media-text-flex, 1)',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <span
          dir='auto'
          style={{
            fontSize: v.font.caption,
            fontWeight: 600,
            color: v.color.inkMuted,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {entity.name}
        </span>
        <span
          dir='auto'
          style={{
            fontSize: v.font.glanceM,
            fontWeight: 600,
            color: unavailable ? v.color.alert : v.color.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {/* Off, idle and Unavailable say so; a title only when there is one. */}
          {unavailable ? stateLabel(entity).toUpperCase() : (title ?? stateLabel(entity))}
        </span>
        {artist && !unavailable && (
          <span
            dir='auto'
            style={{
              fontSize: v.font.body,
              color: v.color.inkMuted,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {artist}
          </span>
        )}
      </div>

      {controls.volume !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: v.space.xs,
            flex: 'var(--ohm-media-volume-flex, 0 0 180px)',
            minWidth: 0,
            color: v.color.inkMuted,
          }}
        >
          <Icon name='mdi:volume-high' size={22} />
          <div style={{ flex: 1, minWidth: 0 }} data-gesture-owner>
            <Slider
              value={controls.volume}
              thickness={v.touch.floor}
              onChangeApplied={v => media('volume_set', { volume_level: v / 100 })}
            />
          </div>
        </div>
      )}

      {(controls.previous || controls.playPause || controls.next) && (
        <div style={{ display: 'flex', gap: v.space.sm, flexShrink: 0 }}>
          {controls.previous && (
            <CardButton icon='mdi:skip-previous' label={tr('media.previous')} onPress={() => media('media_previous_track')} />
          )}
          {controls.playPause === 'pause' && <CardButton icon='mdi:pause' label={tr('media.pause')} onPress={() => media('media_pause')} />}
          {controls.playPause === 'play' && <CardButton icon='mdi:play' label={tr('media.play')} onPress={() => media('media_play')} />}
          {controls.next && <CardButton icon='mdi:skip-next' label={tr('media.next')} onPress={() => media('media_next_track')} />}
        </div>
      )}

      {controls.power && (
        <CardButton
          icon='mdi:power'
          label={controls.power === 'on' ? tr('media.turnOn') : tr('media.turnOff')}
          onPress={() => media(controls.power === 'on' ? 'turn_on' : 'turn_off')}
          active={controls.power === 'off'}
        />
      )}
    </div>
  );
}

/** A player button at the ADR-0001 touch floor. `active` marks power that is on. */
function CardButton({ icon, label, onPress, active = false }: { icon: string; label: string; onPress: () => void; active?: boolean }) {
  return (
    <button
      type='button'
      aria-label={label}
      onClick={onPress}
      style={{
        flexShrink: 0,
        width: v.touch.floor,
        height: v.touch.floor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        borderRadius: v.radius.sm,
        border: `1px solid ${v.color.line}`,
        background: v.color.surfaceWell,
        color: active ? v.color.accent : v.color.ink,
        cursor: 'pointer',
      }}
    >
      <Icon name={icon} size={26} />
    </button>
  );
}
