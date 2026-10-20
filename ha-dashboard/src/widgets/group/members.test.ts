/**
 * What each Member of a Group shows (#73): its own name and Variant where
 * set, Home Assistant's and the Group's while unset.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Entity } from '../../ha';
import { memberShown } from './members';

const entity = (id: string, unavailable = false): Entity => ({
  id,
  domain: id.split('.')[0],
  name: 'Lampada',
  areaId: null,
  deviceId: null,
  labels: [],
  state: unavailable ? 'unavailable' : 'on',
  attributes: {},
  unavailable,
});
const unset = { entity: 'light.a', name: null, variant: null, on_tap: null };

test("unset, a Member shows Home Assistant's name in the Group's Variant", () => {
  const shown = memberShown(unset, entity('light.a'), 'compact');
  assert.equal(shown.entity.name, 'Lampada');
  assert.equal(shown.variant, 'compact');
});

test('a written name replaces it, in the row and in the Fault tile alike', () => {
  for (const unavailable of [false, true]) {
    const shown = memberShown({ ...unset, name: 'Sopra il tavolo' }, entity('light.a', unavailable), 'full');
    assert.equal(shown.entity.name, 'Sopra il tavolo');
    assert.equal(shown.entity.unavailable, unavailable);
  }
});

test("a set Variant holds whatever the Group's, including the Group's own", () => {
  assert.equal(memberShown({ ...unset, variant: 'full' }, entity('light.a'), 'compact').variant, 'full');
  assert.equal(memberShown({ ...unset, variant: 'compact' }, entity('light.a'), 'full').variant, 'compact');
  assert.equal(memberShown({ ...unset, variant: 'full' }, entity('light.a'), 'full').variant, 'full');
});
