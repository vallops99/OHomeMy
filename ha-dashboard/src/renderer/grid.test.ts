/**
 * The proportional grid's placement (#50).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cellPlacement, gridVariables } from './grid';

test('a Widget spans its cells, counted from grid line 1', () => {
  assert.deepEqual(cellPlacement({ x: 0, y: 0, w: 2, h: 1 }), { gridColumn: '1 / span 2', gridRow: '1 / span 1' });
  assert.deepEqual(cellPlacement({ x: 10, y: 7, w: 2, h: 3 }), { gridColumn: '11 / span 2', gridRow: '8 / span 3' });
});

test('the Page hands its columns and rows to the stylesheet', () => {
  assert.deepEqual(gridVariables({ columns: 12, rows: 8 }), { '--ohm-columns': '12', '--ohm-rows': '8' });
});
