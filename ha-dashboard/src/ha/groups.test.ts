import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupMemberIds } from './groups';
import type { Entity } from './types';

const entity = (id: string): Entity => ({
  id,
  domain: id.split('.')[0],
  name: id,
  areaId: null,
  deviceId: null,
  state: 'on',
  attributes: {},
  unavailable: false,
});

/** A Group helper: an entity whose `entity_id` attribute names its members. */
const group = (id: string, members: string[]): Entity => ({ ...entity(id), attributes: { entity_id: members } });

test('an entity with an `entity_id` attribute is a Group, its members in the attribute’s order', () => {
  assert.deepEqual(groupMemberIds(group('lock.accessi', ['lock.b', 'lock.a'])), ['lock.b', 'lock.a']);
});

test('an Unavailable Group, which has lost `entity_id`, is still one through `group_entities`', () => {
  const helper = {
    ...entity('lock.accessi'),
    state: 'unavailable',
    unavailable: true,
    attributes: { group_entities: ['lock.a', 'lock.b'] },
  };
  assert.deepEqual(groupMemberIds(helper), ['lock.a', 'lock.b']);
});

test('an entity without one is not a Group', () => {
  assert.equal(groupMemberIds(entity('lock.cancello')), null);
  assert.equal(groupMemberIds({ ...entity('lock.cancello'), attributes: { entity_id: 'lock.a' } }), null);
});
