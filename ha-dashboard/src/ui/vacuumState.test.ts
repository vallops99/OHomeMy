/**
 * Which controls a `vacuum` gets (#36): start or pause, and back to the
 * dock, as its `supported_features` bitmask allows and its state makes sense.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Entity } from '../ha';
import { vacuumControls } from './vacuumState';

// Home Assistant's VacuumEntityFeature bits.
const PAUSE = 4;
const RETURN_HOME = 16;
const START = 8192;
const ALL = PAUSE | RETURN_HOME | START;

const vacuum = (state: string, supported_features = ALL): Entity => ({
  id: 'vacuum.robot',
  domain: 'vacuum',
  name: 'Robot',
  areaId: null,
  deviceId: null,
  labels: [],
  state,
  attributes: { supported_features },
  unavailable: state === 'unavailable' || state === 'unknown',
});

test('docked, it can start, and is already home', () => {
  assert.deepEqual(vacuumControls(vacuum('docked')), { startPause: 'start', dock: false });
});

test('cleaning, it can pause or go home', () => {
  assert.deepEqual(vacuumControls(vacuum('cleaning')), { startPause: 'pause', dock: true });
});

test('paused or idle away from the dock, it can start again or go home', () => {
  assert.deepEqual(vacuumControls(vacuum('paused')), { startPause: 'start', dock: true });
  assert.deepEqual(vacuumControls(vacuum('idle')), { startPause: 'start', dock: true });
});

test('on its way home, it can start again, and is already going', () => {
  assert.deepEqual(vacuumControls(vacuum('returning')), { startPause: 'start', dock: false });
});

test('a control the vacuum cannot do is never offered', () => {
  assert.deepEqual(vacuumControls(vacuum('cleaning', START)), { startPause: null, dock: false });
  assert.deepEqual(vacuumControls(vacuum('docked', PAUSE | RETURN_HOME)), { startPause: null, dock: false });
});

test('an Unavailable vacuum offers nothing', () => {
  assert.deepEqual(vacuumControls(vacuum('unavailable')), { startPause: null, dock: false });
});
