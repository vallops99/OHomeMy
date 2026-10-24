/**
 * The Concern list's pure half (#30): the rows a Concern shows, named with
 * their Areas and ordered.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Area, Entity } from '../ha';
import { concernRows } from './concernList';
import { DEFAULT_LOCALE, setViewerLocale } from '../i18n';

// In Italian, the copy of the house the panel was built for (#59).
setViewerLocale({ ...DEFAULT_LOCALE, language: 'it' });
const NO_AREA = 'Senza stanza';

const entity = (id: string, name: string, areaId: string | null): Entity => ({
  id,
  domain: id.split('.')[0],
  name,
  areaId,
  deviceId: null,
  state: 'unavailable',
  attributes: {},
  unavailable: true,
});

const area = (id: string, name: string): Area => ({ id, name, icon: null, entities: [] });

// ---- concernRows -----------------------------------------------------------

const areas = [area('salone', 'Salone'), area('cucina', 'Cucina'), area('camera_chri', 'Camera Chri')];

test('each row is named with its Area, and one with none says so', () => {
  const rows = concernRows({ entities: [entity('light.a', 'Lampada', 'salone'), entity('sensor.b', 'Sensore', null)] }, areas);
  assert.deepEqual(
    rows.map(r => [r.entity.id, r.areaName]),
    [
      ['light.a', 'Salone'],
      ['sensor.b', NO_AREA],
    ]
  );
});

test('an Area the registry no longer has reads as no Area', () => {
  const rows = concernRows({ entities: [entity('light.a', 'Lampada', 'gone')] }, areas);
  assert.equal(rows[0].areaName, NO_AREA);
});

test('rows run by Area name, then entity name, with no Area last', () => {
  const rows = concernRows(
    {
      entities: [
        entity('light.z', 'Zeta', null),
        entity('light.s2', 'Spot', 'salone'),
        entity('light.s1', 'Applique', 'salone'),
        entity('light.c', 'Cappa', 'cucina'),
        entity('light.a', 'Abat-jour', null),
        entity('light.k', 'Comodino', 'camera_chri'),
      ],
    },
    areas
  );
  assert.deepEqual(
    rows.map(r => r.entity.name),
    ['Comodino', 'Cappa', 'Applique', 'Spot', 'Abat-jour', 'Zeta']
  );
});

test('an Area named after "Senza stanza" still sorts before the rows with none', () => {
  const rows = concernRows({ entities: [entity('light.a', 'A', null), entity('light.b', 'B', 'z')] }, [area('z', 'Zona Giorno')]);
  assert.deepEqual(
    rows.map(r => r.areaName),
    ['Zona Giorno', NO_AREA]
  );
});

// ---- the state a Malfunction row shows (#80) ---------------------------------

test('a Malfunction row says the state the device is in, and other levels say nothing', () => {
  const device: Entity = { ...entity('vacuum.dw', 'Roborock', 'cucina'), state: 'error', unavailable: false };
  const malfunction = concernRows({ level: 'malfunction', entities: [device] }, areas);
  assert.equal(malfunction[0].stateText, 'Errore');
  const fault = concernRows({ level: 'fault', entities: [device] }, areas);
  assert.equal(fault[0].stateText, null);
});
