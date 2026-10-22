/**
 * Which controls a `media_player` gets (#35): the ones its
 * `supported_features` bitmask says it can do, and never another.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Entity } from '../ha';
import { mediaControls, mediaNowPlaying } from './mediaState';

// Home Assistant's MediaPlayerEntityFeature bits.
const PAUSE = 1;
const VOLUME_SET = 4;
const PREVIOUS = 16;
const NEXT = 32;
const TURN_ON = 128;
const TURN_OFF = 256;
const PLAY = 16384;
const ALL = PAUSE | VOLUME_SET | PREVIOUS | NEXT | TURN_ON | TURN_OFF | PLAY;

const player = (state: string, supported_features: number, attributes: Record<string, unknown> = {}): Entity => ({
  id: 'media_player.echo',
  domain: 'media_player',
  name: 'Echo',
  areaId: null,
  deviceId: null,
  state,
  attributes: { supported_features, ...attributes },
  unavailable: state === 'unavailable' || state === 'unknown',
});

test('playing, a full player offers pause, skip both ways, volume and off', () => {
  assert.deepEqual(mediaControls(player('playing', ALL, { volume_level: 0.35 })), {
    playPause: 'pause',
    previous: true,
    next: true,
    volume: 35,
    power: 'off',
  });
});

test('paused or idle, it offers play instead of pause', () => {
  assert.equal(mediaControls(player('paused', ALL)).playPause, 'play');
  assert.equal(mediaControls(player('idle', ALL)).playPause, 'play');
});

test('a control the player cannot do is never offered', () => {
  assert.deepEqual(mediaControls(player('playing', PAUSE)), {
    playPause: 'pause',
    previous: false,
    next: false,
    volume: null,
    power: null,
  });
  // Paused, but it cannot play: no button that would do nothing.
  assert.equal(mediaControls(player('paused', PAUSE)).playPause, null);
});

test('off, the only control is on -- when it can be turned on', () => {
  assert.deepEqual(mediaControls(player('off', ALL)), { playPause: null, previous: false, next: false, volume: null, power: 'on' });
  assert.deepEqual(mediaControls(player('off', PAUSE)), { playPause: null, previous: false, next: false, volume: null, power: null });
});

test('an Unavailable player offers nothing', () => {
  assert.deepEqual(mediaControls(player('unavailable', ALL)), { playPause: null, previous: false, next: false, volume: null, power: null });
});

test('what is playing: the title, and the artist or channel', () => {
  assert.deepEqual(mediaNowPlaying(player('playing', ALL, { media_title: 'Blue', media_artist: 'Joni Mitchell' })), {
    title: 'Blue',
    artist: 'Joni Mitchell',
  });
  assert.deepEqual(mediaNowPlaying(player('playing', ALL, { media_title: 'Tg1', media_channel: 'Rai 1' })), {
    title: 'Tg1',
    artist: 'Rai 1',
  });
  assert.deepEqual(mediaNowPlaying(player('idle', ALL)), { title: null, artist: null });
});
