/**
 * Selecting a Group's Member in the preview (#73): taps go in one level at
 * a time, keys move between the levels and act on what is selected.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectionKey, selectionTap, shownSelection, type Selection } from './selection';

const group: Selection = { widget: 'g', member: null };
const gate: Selection = { widget: 'g', member: 'lock.gate' };
const members = ['lock.gate', 'lock.door'];

test('the first tap on a Group selects the Group, wherever it lands', () => {
  assert.deepEqual(selectionTap(null, 'g', null), group);
  assert.deepEqual(selectionTap({ widget: 'other', member: null }, 'g', null), group);
  // Member areas show only on the selected Group, so none is under a first tap.
  assert.deepEqual(selectionTap({ widget: 'other', member: 'lock.x' }, 'g', null), group);
});

test('a tap on a member of the selected Group selects that Member', () => {
  assert.deepEqual(selectionTap(group, 'g', 'lock.gate'), gate);
  assert.deepEqual(selectionTap(gate, 'g', 'lock.door'), { widget: 'g', member: 'lock.door' });
});

test("a tap on the Group's frame outside any member goes back to the Group", () => {
  assert.deepEqual(selectionTap(gate, 'g', null), group);
});

test('Enter goes into the Group, to its first Member', () => {
  assert.deepEqual(selectionKey(group, 'Enter', false, members), { selection: gate });
  assert.equal(selectionKey(group, 'Enter', false, []), null, 'a Group with no Members has nothing to go into');
});

test('Escape goes from a Member to its Group, and from the Group to nothing', () => {
  assert.deepEqual(selectionKey(gate, 'Escape', false, members), { selection: group });
  assert.deepEqual(selectionKey(group, 'Escape', false, members), { selection: null });
});

test('Delete and Backspace on a Member remove it, never the Group', () => {
  assert.deepEqual(selectionKey(gate, 'Delete', false, members), { removeMember: 'lock.gate' });
  assert.deepEqual(selectionKey(gate, 'Backspace', false, members), { removeMember: 'lock.gate' });
});

test('Up and Down move a Member in the order; sideways, and Shift, do nothing', () => {
  assert.deepEqual(selectionKey(gate, 'ArrowDown', false, members), { moveMember: { entity: 'lock.gate', by: 1 } });
  assert.deepEqual(selectionKey(gate, 'ArrowUp', false, members), { moveMember: { entity: 'lock.gate', by: -1 } });
  assert.deepEqual(selectionKey(gate, 'ArrowLeft', false, members), { handled: true });
  assert.deepEqual(selectionKey(gate, 'ArrowRight', false, members), { handled: true });
  assert.deepEqual(selectionKey(gate, 'ArrowUp', true, members), { handled: true });
});

test('other keys on a Group are the Widget’s, as before', () => {
  assert.equal(selectionKey(group, 'ArrowUp', false, members), null);
  assert.equal(selectionKey(group, 'Delete', false, members), null);
});

test('a Member no longer in the Group is not selected: the Group is', () => {
  assert.deepEqual(
    shownSelection(gate, ['g'], () => ['lock.door']),
    group
  );
  assert.deepEqual(
    shownSelection(gate, ['g'], () => members),
    gate
  );
  assert.equal(
    shownSelection(gate, ['other'], () => members),
    null,
    'nor is a Widget on another Page'
  );
  assert.equal(
    shownSelection(null, ['g'], () => members),
    null
  );
});
