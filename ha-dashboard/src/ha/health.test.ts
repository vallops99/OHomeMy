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

test('the lights-on Concern carries the main lights left on', () => {
  const lit = entity('light.salone', { state: 'on', labels: ['main'] });
  const report = houseReport([lit, entity('light.lamp', { state: 'on' })]);
  assert.equal(report.verdict.level, 'on');
  assert.deepEqual(
    report.verdict.entities.map(e => e.id),
    ['light.salone']
  );
});

// ---- Lights on (#44) ----
//
// Lights on are no longer a chip: the lights StatCard states them. So the
// report carries the lights-on Concern on its own, whatever outranks it,
// and it never rides along in `also`.

test('a light left on still leads the verdict when nothing louder is wrong', () => {
  const report = houseReport([entity('light.salone', { state: 'on', labels: ['main'] })]);
  assert.equal(report.verdict.level, 'on');
  assert.equal(report.lit, report.verdict);
});

test('the lights-on Concern is reported under a fault, for the lights stat', () => {
  const lit = [entity('light.salone', { state: 'on', labels: ['main'] }), entity('light.cucina', { state: 'on', labels: ['main'] })];
  const report = houseReport([down('light.a'), ...lit]);
  assert.equal(report.verdict.level, 'fault');
  assert.equal(report.lit?.count, 2);
  assert.deepEqual(
    report.lit?.entities.map(e => e.id),
    ['light.salone', 'light.cucina']
  );
  assert.ok(report.also.every(h => h.level !== 'on'));
});

test('a house with no light on has no lights-on Concern', () => {
  assert.equal(houseReport([entity('light.salone', { labels: ['main'] })]).lit, null);
  assert.equal(houseReport([down('light.a')]).lit, null);
});

test('a fault does not silence an open gate, and the lights on stay out of `also`', () => {
  const report = houseReport([
    down('light.a'),
    entity('lock.cancello', { state: 'unlocked' }),
    entity('light.salone', { state: 'on', labels: ['main'] }),
  ]);
  assert.deepEqual(
    [report.verdict, ...report.also].map(h => h.level),
    ['fault', 'open']
  );
});

test('a Page Opener never pressed is not a Fault', () => {
  // An `input_button` is `unknown` until its first press, and a Page
  // Opener is never pressed (ADR-0012).
  const report = houseReport([down('input_button.clima', { state: 'unknown', areaId: null, labels: ['page_main_footer'] })]);
  assert.equal(report.verdict.level, 'ok');
});

// ---- Groups (ADR-0014) ----

const accessi = (parts: Partial<Entity> = {}) =>
  entity('lock.accessi', {
    areaId: null,
    labels: ['page_main_left'],
    state: 'locked',
    attributes: { entity_id: ['lock.cancello'] },
    ...parts,
  });

test('an Unavailable member of a Placed Group is a Fault, though it carries no Area or Label', () => {
  const report = houseReport([accessi(), down('lock.cancello', { areaId: null })]);
  assert.equal(report.verdict.level, 'fault');
  assert.deepEqual(
    report.verdict.entities.map(e => e.id),
    ['lock.cancello']
  );
});

test('a member of a Group Placed nowhere is not rendered, so not a Fault', () => {
  const report = houseReport([accessi({ labels: [] }), down('lock.cancello', { areaId: null })]);
  assert.equal(report.verdict.level, 'ok');
});

test('a Group helper is never shown, so it is not a Fault when Unavailable', () => {
  const report = houseReport([accessi({ state: 'unavailable', unavailable: true }), entity('lock.cancello', { state: 'locked' })]);
  assert.equal(report.verdict.level, 'ok');
});

test('an open gate is counted once, not again through its Group', () => {
  const report = houseReport([accessi({ state: 'unlocked' }), entity('lock.cancello', { state: 'unlocked' })]);
  assert.equal(report.verdict.level, 'open');
  assert.deepEqual(
    report.verdict.entities.map(e => e.id),
    ['lock.cancello']
  );
});
