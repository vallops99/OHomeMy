import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { OHomeMyDocument } from '../document/types';
import type { HistoryEntry } from '../ha/document';
import { historyRows, undoTarget } from './history';

const doc = (n: number): OHomeMyDocument => ({ dashboards: [{ n } as never] });
const entry = (revision: number): HistoryEntry => ({ revision, saved_at: `t${revision}`, user_id: 'u', document: doc(revision) });

test('rows are the history newest first, marking the current revision', () => {
  const rows = historyRows([entry(5), entry(4), entry(3)], 5);
  assert.deepEqual(
    rows.map(r => [r.revision, r.current]),
    [
      [5, true],
      [4, false],
      [3, false],
    ]
  );
  assert.deepEqual(rows[1].document, doc(4));
});

test('a history reaching back to revision 1 ends with the empty revision 0', () => {
  const rows = historyRows([entry(2), entry(1)], 2);
  assert.deepEqual(
    rows.map(r => r.revision),
    [2, 1, 0]
  );
  assert.deepEqual(rows[2].document, { dashboards: [] });
  assert.equal(rows[2].savedAt, null);
});

test('a history cut short (it keeps the last 20) has no revision 0', () => {
  assert.deepEqual(
    historyRows([entry(30), entry(29)], 30).map(r => r.revision),
    [30, 29]
  );
});

test('undoing the last Publish restores the revision before it', () => {
  assert.equal(undoTarget(historyRows([entry(5), entry(4)], 5))?.revision, 4);
  assert.equal(undoTarget(historyRows([entry(1)], 1))?.revision, 0, 'even the first');
});

test('there is nothing to undo with no earlier revision, or a stale history', () => {
  assert.equal(undoTarget(historyRows([], 0)), null);
  assert.equal(undoTarget(historyRows([entry(30)], 30)), null);
  assert.equal(undoTarget(historyRows([entry(5), entry(4)], 6)), null);
});
