/**
 * The Widget fit check (#72): every Widget kind keeps `WIDGET_HEADROOM_PX`
 * to spare at each of its layout steps and at its Smallest box, in every
 * shipped catalogue.
 *
 * A Widget's box is sized by the proportional grid, and inside it each kind
 * changes layout with container queries. The Builder's preview measures each
 * Widget at the two ends of a Dashboard's supported range, in the admin's
 * language, on the admin's device; this measures what it cannot see: the
 * sizes just past each threshold, where a step has only its headroom to
 * spare, and every language.
 *
 * ## What it runs against
 *
 * The real kinds (`Component` and `css` from the registry), on the page
 * `fit-widgets.html` (`src/fit/main.tsx`), served by Vite and driven by
 * Chromium. Entities come from the local Home Assistant with the fake house
 * (`fake-house/`), as the app gets them -- @hakit's store is never stubbed,
 * for the reason fake-house's README gives. Each kind is measured in its
 * fullest state (`src/fit/cases.ts` says which entity, and why); the house
 * is driven there first and put back after, helper by helper.
 *
 * ## The property
 *
 * At every probe -- each Variant's Smallest box, and the lowest box of each
 * layout step (`WidgetKind.steps`), just past its threshold -- the content
 * shows whole by `builder/fit.ts`'s rule (the Builder's own) in its box less
 * `WIDGET_HEADROOM_PX` on the axes the probe guards. A threshold set back to
 * the content's exact size leaves 1 px to spare there, and fails.
 *
 * ## Running it
 *
 *     npm run fit
 *
 * Needs the local Home Assistant up (`.env`'s `VITE_HA_URL`, the token in
 * `.env.development`) and a Chromium: inside `nix develop`, `CHROME` is set,
 * as for `npm run measure`. Run by hand; the repo has no CI. `--verbose`
 * lists every probe with its room to spare, not only the failures.
 *
 *     npm run fit -- --least
 *
 * measures each kind's Smallest box instead: for each Variant, in each
 * language, the least box it fits in with the headroom, searched down from
 * 1200×1000 one axis at a time, and the widest and tallest of the six. A
 * kind whose type grows with its box can fit at one size and not at a
 * larger one, so the box this gives is checked like any other.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { drive, restore, states } from './fit-house.ts';
import { FIT_LANGUAGES, FULLEST, type Measured } from '../src/fit/cases.ts';
import { WIDGET_HEADROOM_PX } from '../src/ui/vars.ts';

const executablePath = process.env.CHROME;
if (!executablePath) {
  console.error('No CHROME set. Run inside `nix develop` (flake.nix exports it), or point CHROME at a Chromium binary.');
  process.exit(2);
}

const before = await states().catch(err => {
  console.error(`Home Assistant is not reachable: ${err.message}. Start the local one (fake-house/README.md).`);
  process.exit(2);
});

console.log('The fullest Widget of each kind:');
for (const [kind, f] of Object.entries(FULLEST))
  console.log(`  ${kind.padEnd(15)} ${JSON.stringify(f.settings)}\n  ${''.padEnd(15)} ${f.why}`);

const server = await createServer({ mode: 'development', server: { port: 5310, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = `${server.resolvedUrls!.local[0]}fit-widgets.html`;
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-gpu'] });
const failures: string[] = [];
const verbose = process.argv.includes('--verbose');
const leastOnly = process.argv.includes('--least');

/** Each Smallest box probe's least box in every language, and the widest and tallest of them. */
async function least() {
  const found = new Map<string, { width: number; height: number }[]>();
  for (const lang of FIT_LANGUAGES) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    await page.goto(`${url}?lang=${lang}`);
    await page.waitForFunction(() => window.__fit !== undefined, null, { timeout: 90_000 });
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll('[data-probe$="/smallest"]')].map(e => e.getAttribute('data-probe')!)
    );
    for (const id of ids) {
      const box = await page.evaluate(id => window.__least!(id, { width: 1200, height: 1000 }), id);
      found.set(id, [...(found.get(id) ?? []), box ?? { width: Infinity, height: Infinity }]);
    }
    await page.close();
  }
  console.log('\nThe least box each fits in, with the headroom, across every language:');
  for (const [id, boxes] of found) {
    const width = Math.max(...boxes.map(b => b.width));
    const height = Math.max(...boxes.map(b => b.height));
    console.log(
      `  ${id.replace('/smallest', '').padEnd(24)} ${Number.isFinite(width) ? `{ width: ${width}, height: ${height} }` : 'fits nowhere up to 1200×1000'}`
    );
  }
}

try {
  await drive();
  if (leastOnly) await least();
  else
    for (const lang of FIT_LANGUAGES) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      page.on('pageerror', err => console.warn(`  ! ${lang}: ${err.message}`));
      await page.goto(`${url}?lang=${lang}`);
      await page.waitForFunction(() => window.__fit !== undefined, null, { timeout: 90_000 });
      const result = (await page.evaluate(() => window.__fit))!;
      await page.close();
      if ('error' in result) {
        failures.push(`${lang}: the page failed: ${result.error}`);
        continue;
      }
      failures.push(...result.missing.map(m => `${lang}: ${m}`));
      const failed = result.measured.filter((m: Measured) => !m.fits);
      console.log(
        `\n${lang}: ${result.measured.length - failed.length}/${result.measured.length} probes keep ${WIDGET_HEADROOM_PX} px to spare`
      );
      for (const m of result.measured as Measured[]) {
        const spare = Object.entries(m.spare)
          .map(([axis, px]) => `${axis} ${px < 0 ? 'does not fit' : `${px} px`}`)
          .join(', ');
        const line = `${m.kind} ${m.variant}, ${m.name}, ${m.width}×${m.height}: spare ${spare}${m.error ? ` (${m.error})` : ''}`;
        if (!m.fits) {
          console.log(`  FAIL  ${line}`);
          failures.push(`${lang}: ${line}`);
        } else if (verbose) console.log(`  PASS  ${line}`);
      }
    }
} finally {
  await browser.close();
  await server.close();
  await restore(before);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s).`);
  process.exit(1);
}
if (!leastOnly)
  console.log(`\nEvery Widget kind keeps ${WIDGET_HEADROOM_PX} px to spare at each layout step and its Smallest box, in every language.`);
