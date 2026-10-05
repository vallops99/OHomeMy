import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { BedDouble, CookingPot, Fence, Sofa } from 'lucide-react';
import { FALLBACK_ICON, isMapped, lucideFor } from './iconMap';

test('an MDI name resolves to its Lucide glyph, with or without the prefix', () => {
  assert.equal(lucideFor('mdi:sofa'), Sofa);
  assert.equal(lucideFor('sofa'), Sofa);
});

test("the house's own Area and gate icons are mapped", () => {
  assert.equal(lucideFor('mdi:stove'), CookingPot);
  assert.equal(lucideFor('mdi:bed'), BedDouble);
  assert.equal(lucideFor('mdi:gate'), Fence);
});

test('an unmapped name renders the neutral fallback, never nothing', () => {
  assert.equal(lucideFor('mdi:not-a-real-icon'), FALLBACK_ICON);
  assert.equal(isMapped('mdi:not-a-real-icon'), false);
});

test("a non-MDI set's name is unmapped, even when the glyph name matches", () => {
  assert.equal(lucideFor('hass:sofa'), FALLBACK_ICON);
});

test('every battery step the vacuum card can ask for is mapped', () => {
  for (let level = 10; level <= 90; level += 10) assert.ok(isMapped(`mdi:battery-${level}`), `battery-${level}`);
});

/**
 * The panel's own MDI names -- Domain defaults, state icons, weather -- must
 * never fall back: only names Home Assistant hands over should. Scanned from
 * the source so a new literal cannot slip past the map.
 */
test('every MDI name the source itself spells is mapped', () => {
  const dir = new URL('.', import.meta.url).pathname;
  const files = readdirSync(dir).filter(f => /\.tsx?$/.test(f) && !f.endsWith('.test.ts'));
  const names = new Set<string>();
  for (const f of files) {
    for (const m of readFileSync(join(dir, f), 'utf8').matchAll(/'(mdi:[a-z0-9-]+)'/g)) names.add(m[1]);
  }
  assert.ok(names.size > 50, 'the scan found the source');
  const unmapped = [...names].filter(n => !isMapped(n));
  assert.deepEqual(unmapped, []);
});
