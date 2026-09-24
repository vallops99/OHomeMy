/**
 * What a single Placed `light` or `switch` can be asked to do (#16), through
 * the two readings `ToggleTile` renders from.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Entity } from '../ha';
import { brightnessPercent, supportsBrightness } from './lightState';

const entity = (id: string, attributes: Record<string, unknown> = {}, state = 'on'): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: null,
  deviceId: null,
  labels: [],
  state,
  attributes,
  unavailable: state === 'unavailable',
});

test('a light whose only colour mode is onoff has no brightness to drive', () => {
  assert.equal(supportsBrightness(entity('light.lampada', { supported_color_modes: ['onoff'] })), false);
});

test('a dimmable light supports brightness, whatever mode carries it', () => {
  for (const mode of ['brightness', 'color_temp', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww', 'white']) {
    assert.equal(supportsBrightness(entity('light.lampada', { supported_color_modes: [mode] })), true, mode);
  }
});

test('a light that declares no colour modes is not assumed dimmable', () => {
  assert.equal(supportsBrightness(entity('light.lampada')), false);
});

test('a switch never supports brightness, even with a stray attribute', () => {
  assert.equal(supportsBrightness(entity('switch.presa', { supported_color_modes: ['brightness'] })), false);
});

test('brightness arrives 0-255 and is shown 0-100', () => {
  assert.equal(brightnessPercent(entity('light.lampada', { brightness: 255 })), 100);
  assert.equal(brightnessPercent(entity('light.lampada', { brightness: 128 })), 50);
});

test('a light that is off, or has not reported brightness, reads as 0', () => {
  assert.equal(brightnessPercent(entity('light.lampada', {}, 'off')), 0);
  assert.equal(brightnessPercent(null), 0);
});
