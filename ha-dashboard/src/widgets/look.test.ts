/**
 * A Widget takes its look from its Dashboard's Theme and its size from its
 * own box, never from the device (#62, ADR-0015): nothing a Widget or the
 * renderer draws through may read `t` (`ui/theme.ts`, values fixed at load
 * and sized by the device) or `isPhone` (`ui/device.ts`).
 *
 * Checked over every module the Widgets and the renderer reach, following
 * relative imports through `src/ui`, so a shared component counts too.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';

const SRC = resolve(new URL('.', import.meta.url).pathname, '..');

/**
 * The one place a Widget's code may ask about the device: something that
 * covers the whole screen, whose box is the screen. Each entry says why.
 */
const DEVICE_ALLOWED: Record<string, string> = {
  'ui/SelectTile.tsx': "the picker covers the whole screen: a phone's fills it, a wall's is a centred card",
};

const FORBIDDEN = { 'ui/theme.ts': 't', 'ui/device.ts': 'isPhone' } as const;

function sources(dir: string): string[] {
  return readdirSync(join(SRC, dir), { recursive: true, encoding: 'utf8' })
    .filter(f => /\.tsx?$/.test(f) && !f.includes('.test.'))
    .map(f => join(dir, f));
}

function resolveImport(from: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = join(dirname(from), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (/\.tsx?$/.test(candidate) && existsSync(join(SRC, candidate))) return candidate;
  }
  return null;
}

const importsOf = (file: string) =>
  [...readFileSync(join(SRC, file), 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)]
    .map(m => resolveImport(file, m[1]))
    .filter((f): f is string => f !== null)
    .map(f => relative(SRC, join(SRC, f)));

/** Every module under `src/widgets` and `src/renderer`, and every `src/ui` one they reach. */
function reached(): Map<string, string[]> {
  const seen = new Map<string, string[]>();
  const queue = [...sources('widgets'), ...sources('renderer')];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    const imports = importsOf(file);
    seen.set(file, imports);
    queue.push(...imports.filter(f => /^(ui|widgets|renderer)\//.test(f)));
  }
  return seen;
}

test('nothing a Widget or the renderer draws through reads t or isPhone', () => {
  const offenders = [...reached()].flatMap(([file, imports]) =>
    imports
      .filter((f): f is keyof typeof FORBIDDEN => f in FORBIDDEN)
      .filter(f => !(f === 'ui/device.ts' && file in DEVICE_ALLOWED))
      .map(f => `${file} imports ${FORBIDDEN[f]} from ${f}`)
  );
  assert.deepEqual(offenders, []);
});

test('each device exception is still reached, still needed, and says why in place', () => {
  const graph = reached();
  for (const file of Object.keys(DEVICE_ALLOWED)) {
    assert.ok(graph.has(file), `${file} is no longer reached: drop it from DEVICE_ALLOWED`);
    assert.ok(graph.get(file)!.includes('ui/device.ts'), `${file} no longer reads isPhone: drop it from DEVICE_ALLOWED`);
    const lines = readFileSync(join(SRC, file), 'utf8').split('\n');
    const use = lines.findIndex(l => /\bisPhone\b/.test(l) && !l.startsWith('import'));
    const comment = lines.slice(Math.max(0, use - 6), use).join(' ');
    assert.ok(/whole screen/.test(comment), `${file}: say above the isPhone use why it covers the whole screen`);
  }
});
