/**
 * Which of a Theme's two sets a Dashboard shows (#70): its Mode, the house's
 * entity, the device, and the connection.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { houseScheme, schemeShown, type SchemeInputs } from './schemeShown';

const at = (inputs: Partial<SchemeInputs>): SchemeInputs => ({
  mode: 'follow-house',
  houseState: null,
  connected: true,
  device: 'none',
  previous: null,
  ...inputs,
});

test('light and dark are fixed, whatever the house and the device say', () => {
  for (const mode of ['light', 'dark'] as const)
    for (const device of ['light', 'dark', 'none'] as const)
      for (const connected of [true, false])
        assert.equal(schemeShown(at({ mode, device, connected, houseState: 'above_horizon', previous: 'light' })), mode);
});

test('following the device shows what the device prefers, and dark when it cannot say', () => {
  assert.equal(schemeShown(at({ mode: 'follow-device', device: 'light' })), 'light');
  assert.equal(schemeShown(at({ mode: 'follow-device', device: 'dark' })), 'dark');
  assert.equal(schemeShown(at({ mode: 'follow-device', device: 'none' })), 'dark');
});

test('following the device does not care about the connection', () => {
  assert.equal(schemeShown(at({ mode: 'follow-device', device: 'light', connected: false, previous: 'dark' })), 'light');
});

test('the sun above the horizon is light, below it dark', () => {
  assert.equal(schemeShown(at({ houseState: 'above_horizon', device: 'dark' })), 'light');
  assert.equal(schemeShown(at({ houseState: 'below_horizon', device: 'light' })), 'dark');
});

test('a binary sensor or a boolean on is light, off dark', () => {
  assert.equal(schemeShown(at({ houseState: 'on', device: 'dark' })), 'light');
  assert.equal(schemeShown(at({ houseState: 'off', device: 'light' })), 'dark');
});

test('an entity that cannot say, while connected, hands over to the device', () => {
  for (const houseState of ['unavailable', 'unknown', null, 'something else'])
    for (const device of ['light', 'dark'] as const)
      assert.equal(
        schemeShown(at({ houseState, device, previous: device === 'light' ? 'dark' : 'light' })),
        device,
        `${houseState}, ${device}`
      );
});

test('an entity that cannot say, on a device that cannot either, is dark', () => {
  for (const houseState of ['unavailable', 'unknown', null])
    assert.equal(schemeShown(at({ houseState, device: 'none', previous: 'light' })), 'dark');
});

test('a lost connection keeps what is shown, whatever the last state and the device say', () => {
  for (const previous of ['light', 'dark'] as const)
    for (const houseState of ['on', 'off', 'unavailable', null])
      for (const device of ['light', 'dark', 'none'] as const)
        assert.equal(schemeShown(at({ connected: false, previous, houseState, device })), previous);
});

test('back online, the entity decides again, or the device when it cannot', () => {
  assert.equal(schemeShown(at({ connected: true, previous: 'dark', houseState: 'on' })), 'light');
  assert.equal(schemeShown(at({ connected: true, previous: 'dark', houseState: 'unknown', device: 'light' })), 'light');
});

test('the first render with no known state yet follows the fallback chain', () => {
  assert.equal(schemeShown(at({ previous: null, houseState: null, device: 'light' })), 'light');
  assert.equal(schemeShown(at({ previous: null, houseState: null, device: 'none' })), 'dark');
  // Not connected yet, with nothing shown to keep: the same chain, from what is known.
  assert.equal(schemeShown(at({ connected: false, previous: null, houseState: null, device: 'light' })), 'light');
  assert.equal(schemeShown(at({ connected: false, previous: null, houseState: 'off', device: 'light' })), 'dark');
});

test("the house's state reads as light, dark, or nothing", () => {
  assert.equal(houseScheme('above_horizon'), 'light');
  assert.equal(houseScheme('on'), 'light');
  assert.equal(houseScheme('below_horizon'), 'dark');
  assert.equal(houseScheme('off'), 'dark');
  assert.equal(houseScheme('unavailable'), null);
  assert.equal(houseScheme('unknown'), null);
  assert.equal(houseScheme(null), null);
});
