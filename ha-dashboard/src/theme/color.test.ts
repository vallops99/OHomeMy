import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contrast, flatten, hexToHsl, withAlpha } from './color';

test('contrast is the WCAG ratio: black on white is 21:1, a colour on itself 1:1', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#ffffff', '#000000'), 21);
  assert.equal(contrast('#777777', '#777777'), 1);
});

test('contrast matches a known mid-grey value', () => {
  // #767676 on white is the classic 4.54:1, the lightest grey that passes AA.
  assert.equal(Math.round(contrast('#767676', '#ffffff') * 100) / 100, 4.54);
});

test('a translucent foreground is measured as it composites over its ground', () => {
  // White at 0% over black is black: no contrast at all.
  assert.equal(contrast('#ffffff00', '#000000'), 1);
  assert.ok(contrast('#ffffff80', '#000000') < contrast('#ffffff', '#000000'));
});

test('hexToHsl converts to whole-number hue, saturation and lightness', () => {
  assert.deepEqual(hexToHsl('#ff0000'), { h: 0, s: 100, l: 50 });
  assert.deepEqual(hexToHsl('#808080'), { h: 0, s: 0, l: 50 });
  assert.deepEqual(hexToHsl('#f5c15c'), { h: 40, s: 88, l: 66 });
});

test('withAlpha appends an alpha byte to an opaque hex', () => {
  assert.equal(withAlpha('#0e0f0d', 0.72), '#0e0f0db8');
  assert.equal(withAlpha('#0e0f0d', 1), '#0e0f0dff');
});

test('flatten lays a translucent colour over an opaque one', () => {
  assert.equal(flatten('#ffffff80', '#000000'), '#808080');
  assert.equal(flatten('#123456', '#ffffff'), '#123456');
});
