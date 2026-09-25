/**
 * The Verdict's Concerns carry the entities behind them (#30), so a
 * Concern list can show exactly what a chip counts without recomputing the
 * rule.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { houseReport } from './health';
import type { Entity } from './types';

const entity = (id: string, parts: Partial<Entity> = {}): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: 'salone',
  deviceId: null,
  labels: [],
  state: 'off',
  attributes: {},
  unavailable: false,
  ...parts,
});

const down = (id: string, parts: Partial<Entity> = {}) => entity(id, { state: 'unavailable', unavailable: true, ...parts });

test('a calm house has no entities behind its verdict', () => {
  const report = houseReport([entity('light.salone')]);
  assert.equal(report.verdict.level, 'ok');
  assert.deepEqual(report.verdict.entities, []);
});

test('the fault Concern carries every reportable Fault, not just three', () => {
  const faults = ['light.a', 'light.b', 'light.c', 'light.d'].map(id => down(id));
  const report = houseReport([...faults, entity('light.ok')]);
  assert.equal(report.verdict.level, 'fault');
  assert.equal(report.verdict.count, 4);
  assert.deepEqual(
    report.verdict.entities.map(e => e.id),
    ['light.a', 'light.b', 'light.c', 'light.d']
  );
});

test('a Fault the panel would not render is not in the list', () => {
  const report = houseReport([down('light.a'), down('sensor.nowhere', { areaId: null }), down('update.core')]);
  assert.deepEqual(
    report.verdict.entities.map(e => e.id),
    ['light.a']
  );
});

test('open doors and unlocked gates are one Concern, each carrying only its own', () => {
  const door = entity('binary_sensor.porta', { state: 'on', attributes: { device_class: 'door' } });
  const gate = entity('lock.cancello', { state: 'unlocked' });
  const report = houseReport([down('light.a'), door, gate, entity('lock.box', { state: 'locked' })]);
  assert.deepEqual(
    report.verdict.entities.map(e => e.id),
    ['light.a']
  );
  const open = report.also.find(h => h.level === 'open');
  assert.deepEqual(
    open?.entities.map(e => e.id),
    ['binary_sensor.porta', 'lock.cancello']
  );
});

test('the lit Concern carries the lit main lights', () => {
  const lit = entity('light.salone', { state: 'on', labels: ['main'] });
  const report = houseReport([lit, entity('light.lamp', { state: 'on' })]);
  assert.equal(report.verdict.level, 'on');
  assert.deepEqual(
    report.verdict.entities.map(e => e.id),
    ['light.salone']
  );
});
