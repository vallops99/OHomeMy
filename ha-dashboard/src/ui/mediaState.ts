/**
 * What a `media_player` can be asked to do, read from its
 * `supported_features` bitmask (#35). A control the player cannot do is
 * never offered: a button that does nothing is a dead control that looks
 * live (PlacementView.tsx).
 */
import type { Entity } from '../ha';

/** Home Assistant's `MediaPlayerEntityFeature` bits, the ones the panel offers. */
const FEATURE = {
  pause: 1,
  volumeSet: 4,
  previous: 16,
  next: 32,
  turnOn: 128,
  turnOff: 256,
  play: 16384,
} as const;

export type MediaControls = {
  /** The one transport button in the middle, or none. */
  playPause: 'play' | 'pause' | null;
  previous: boolean;
  next: boolean;
  /** 0-100, or `null` when the volume cannot be set right now. */
  volume: number | null;
  /** The power button: turn it on, turn it off, or none. */
  power: 'on' | 'off' | null;
};

const NONE: MediaControls = { playPause: null, previous: false, next: false, volume: null, power: null };

export function mediaControls(entity: Entity): MediaControls {
  if (entity.unavailable) return NONE;
  const features = Number(entity.attributes.supported_features) || 0;
  const can = (bit: number) => (features & bit) !== 0;

  // Off, a player can only be turned on; anything else would wake it by
  // surprise or do nothing.
  if (entity.state === 'off') return { ...NONE, power: can(FEATURE.turnOn) ? 'on' : null };

  const playing = entity.state === 'playing';
  const volume = Number(entity.attributes.volume_level);
  return {
    playPause: playing ? (can(FEATURE.pause) ? 'pause' : null) : can(FEATURE.play) ? 'play' : null,
    previous: can(FEATURE.previous),
    next: can(FEATURE.next),
    volume: can(FEATURE.volumeSet) ? Math.round((Number.isNaN(volume) ? 0 : volume) * 100) : null,
    power: can(FEATURE.turnOff) ? 'off' : null,
  };
}

/** Home Assistant's `media_title`, and the artist -- or the channel, for a TV. */
export function mediaNowPlaying(entity: Entity): { title: string | null; artist: string | null } {
  const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
  return {
    title: text(entity.attributes.media_title),
    artist: text(entity.attributes.media_artist) ?? text(entity.attributes.media_channel),
  };
}
