/**
 * Members' Page references and their written shape (#73).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapMemberTaps, memberOnTap, membersInFull, readAreaMembers, readMembers } from './members';
import { defineSchema } from './schema';
import type { OHomeMyDocument, Widget } from './types';

const group = defineSchema({
  kind: 'group',
  variants: ['full'],
  titled: true,
  settings: { members: { type: 'members', domains: [], variantDomains: [] } },
});
const schemaOf = (kind: string) => (kind === 'group' ? group : undefined);

const widget = (kind: string, settings: Record<string, unknown>): Widget => ({
  id: kind,
  kind,
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  variant: 'full',
  title: null,
  on_tap: null,
  settings,
});

const doc = (...widgets: Widget[]) =>
  ({
    dashboards: [{ pages: [{ id: 'home', widgets }] }],
  }) as unknown as OHomeMyDocument;

test('a Group saved before Members is written with every Member in full', () => {
  const before = doc(widget('group', { members: ['light.a', { entity: 'light.b', name: 'B' }] }), widget('clock', { members: ['x'] }));
  const after = membersInFull(before, schemaOf);
  assert.deepEqual(after.dashboards[0].pages[0].widgets[0].settings.members, [
    { entity: 'light.a', name: null, variant: null, on_tap: null },
    { entity: 'light.b', name: 'B', variant: null, on_tap: null },
  ]);
  assert.deepEqual(after.dashboards[0].pages[0].widgets[1].settings, { members: ['x'] }, 'a kind without a members field is left alone');
});

test('a document already in full is returned as it is', () => {
  const before = doc(widget('group', { members: [{ entity: 'light.a', name: null, variant: null, on_tap: null }] }));
  assert.equal(membersInFull(before, schemaOf), before);
});

test('an empty or mistyped field reads as unset', () => {
  assert.deepEqual(readMembers([{ entity: 'light.a', name: '', variant: 'tiny', on_tap: 3 }]), [
    { entity: 'light.a', name: null, variant: null, on_tap: null },
  ]);
});

test("a Room Grid's Members carry taps as a Group's do", () => {
  const grid = widget('room_grid', { areas: [{ area: 'salone', on_tap: 'rooms' }, 'cucina', { area: 'bagno', on_tap: null }] });
  assert.equal(memberOnTap(grid, 'salone'), 'rooms');
  assert.equal(memberOnTap(grid, 'cucina'), null);
  assert.equal(memberOnTap(grid, 'bagno'), null);
  const moved = mapMemberTaps(grid, p => (p === 'rooms' ? 'rooms-2' : p));
  assert.deepEqual(moved.settings.areas, [{ area: 'salone', on_tap: 'rooms-2' }, 'cucina', { area: 'bagno', on_tap: null }]);
  assert.equal(
    mapMemberTaps(grid, p => p),
    grid
  );
});

test("a Room Grid's Areas read in full for the Builder, a plain id with no tap", () => {
  assert.deepEqual(readAreaMembers(['salone', { area: 'cucina', on_tap: 'rooms' }, { area: 'bagno', on_tap: 3 }, 7]), [
    { area: 'salone', on_tap: null },
    { area: 'cucina', on_tap: 'rooms' },
    { area: 'bagno', on_tap: null },
  ]);
});
