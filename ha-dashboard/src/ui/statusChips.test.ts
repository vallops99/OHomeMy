/**
 * The status bar's chips (#44, docs/protocol.md "The chips"): which there
 * are, in what order, and what each says.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Entity } from '../ha';
import { houseReport } from '../ha/health';
import { statusChips } from './statusChips';
import { DEFAULT_LOCALE, setViewerLocale } from '../i18n';

// In Italian, the copy of the house the panel was built for (#59).
setViewerLocale({ ...DEFAULT_LOCALE, language: 'it' });

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

const down = (id: string) => entity(id, { state: 'unavailable', unavailable: true });
const lit = entity('light.salone', { state: 'on', labels: ['main'] });
const gate = entity('lock.cancello', { state: 'unlocked' });
const alarm = entity('alarm_control_panel.casa', { state: 'disarmed', areaId: null });
const cameras = ['camera.a', 'camera.b', 'camera.c'].map(id => entity(id, { areaId: 'esterno' }));

const chips = (entities: Entity[], opts: { cameras?: Entity[]; moving?: Entity[]; alarm?: Entity | null } = {}) =>
  statusChips({ report: houseReport(entities), cameras: opts.cameras ?? [], moving: opts.moving ?? [], alarm: opts.alarm ?? null });

test('the order is Fault, open way in, cameras, alarm -- all four, never capped', () => {
  const row = chips([down('light.a'), gate, lit], { cameras, alarm });
  assert.deepEqual(
    row.map(c => c.key),
    ['fault', 'open', 'cameras', 'alarm']
  );
});

test('lit zones are never a chip, even when they are the Verdict', () => {
  assert.deepEqual(
    chips([lit], { alarm }).map(c => c.key),
    ['alarm']
  );
  assert.deepEqual(
    chips([down('light.a'), lit]).map(c => c.key),
    ['fault']
  );
});

test('a calm house with nothing to show has no chips at all', () => {
  assert.deepEqual(chips([entity('light.salone')]), []);
});

test('each chip only when there is one to show', () => {
  assert.deepEqual(
    chips([gate], { cameras }).map(c => c.key),
    ['open', 'cameras']
  );
});

test('only a Fault is in the alert tone', () => {
  const row = chips([down('light.a'), gate], { cameras, alarm });
  assert.deepEqual(
    row.map(c => c.tone),
    ['alert', 'neutral', 'neutral', 'neutral']
  );
});

test('a Concern chip says its headline and opens its Concern list', () => {
  const [fault, open] = chips([down('light.a'), down('light.b'), gate]);
  assert.equal(fault.text, '2 guasti');
  assert.deepEqual(fault.opens, { kind: 'concern', level: 'fault' });
  assert.equal(open.text, 'Un accesso aperto');
  assert.deepEqual(open.opens, { kind: 'concern', level: 'open' });
});

test('the camera chip counts the cameras and says whether any sees motion', () => {
  const [quiet] = chips([], { cameras });
  assert.equal(quiet.text, '3 telecamere · nessun movimento');
  assert.deepEqual(quiet.opens, { kind: 'cameras' });

  const [moving] = chips([], { cameras, moving: [cameras[1]] });
  assert.equal(moving.text, '3 telecamere · movimento rilevato');

  const [one] = chips([], { cameras: [cameras[0]] });
  assert.equal(one.text, '1 telecamera · nessun movimento');
});

test('an Unavailable camera is said on its chip, which stays neutral: the Fault chip carries the alert', () => {
  const faulted = [down('camera.a'), ...cameras.slice(1)];
  const row = chips(faulted, { cameras: faulted, moving: [cameras[1]] });
  const camera = row.find(c => c.key === 'cameras');
  assert.equal(camera?.text, '3 telecamere · 1 non disponibile');
  assert.equal(camera?.tone, 'neutral');
  assert.equal(row[0].key, 'fault');
});

test('the alarm chip says its state and opens its Modal', () => {
  const [chip] = chips([], { alarm });
  assert.equal(chip.text, 'Disinserito');
  assert.deepEqual(chip.opens, { kind: 'alarm' });
});
