/**
 * The left column's fit, asserted rather than claimed (ADR-0007).
 *
 * Every sizing number in `src/theme/tokens.ts` carries a comment saying it was
 * "measured, not guessed" -- and every one of those measurements came from a
 * throwaway script that was never committed. Three passes each believed
 * themselves measured; each shipped a defect a human found by looking at the
 * panel. This file is that script, committed, so the claim is checkable by
 * anyone and the next change to the left column either holds the property or
 * fails here.
 *
 * ## The property
 *
 * At any viewport at least 1280x768, with the fixture's content:
 *
 *   1. **Nothing in the left column scrolls.** A `glance` you have to scroll
 *      is not a glance (CONTEXT.md: the Verdict is read on approach from 2 m);
 *      a scrollbar there is a layout that does not fit wearing a disguise.
 *   2. **No two siblings overlap.** An element may not paint over its
 *      neighbour, which is the failure the negative-margin Hero produced and
 *      the one `scrollHeight`-only probes cannot see.
 *
 * Both are asserted at 1280x768 (the shortest supported) and 1280x800 (the
 * wall panel's native size). Stated as a property of every viewport >= the
 * floor rather than a list of samples, because a fit proven on samples and
 * broken between them is exactly how the defect in ADR-0007 reached the wall.
 *
 * ## Why a reproduction and not the app
 *
 * The real app needs a live Home Assistant (`.env` -> `VITE_HA_URL`), so
 * driving it here would make a layout check depend on the house being up. This
 * builds the left column's *shape* from the same tokens the components import,
 * with the fixture's own content (two gates, three cameras, the two chips in
 * `fake-house/manifest.yaml`) hardcoded as markup.
 *
 * The cost, recorded because it is real: this measures a reproduction, so a
 * component that changes its own internal structure can drift from what is
 * asserted here without failing. What it cannot drift on is *sizing* -- every
 * number below comes from `buildTokens()` -- the same tokens the components
 * import -- so a token change moves this harness with it. It imports only
 * `tokens.ts` and never a component: a component pulls in the whole @hakit
 * chain, which does not load outside Vite. If the column's
 * structure changes (a region gains a child, the flex direction flips), update
 * the markup here in the same commit. Driving the real app against the
 * `fake-house` fixture is the honest upgrade when the fixture can be served
 * without a live Home Assistant.
 *
 * ## Running it
 *
 *     npm run measure
 *
 * Needs a browser. Playwright's own bundled Chromium cannot run on NixOS (it
 * dies on `libglib-2.0.so.0`), so `flake.nix` puts `pkgs.chromium` in the
 * devshell and exports `CHROME`; inside `nix develop` this just works. Set
 * `CHROME` yourself to point at any other Chromium.
 */
import { chromium } from 'playwright-core';
import { buildTokens } from '../src/theme/tokens.ts';

const t = buildTokens();

/**
 * The chip box's height, the same arithmetic `src/ui/ChipRow.tsx` uses.
 *
 * Whole lines plus the gaps between them. Repeated here rather than imported
 * because this harness imports only `tokens.ts` and never a component (see
 * the header): if the component's formula changes, this must change with it
 * in the same commit.
 */
const CHIP_BOX_H = t.layout.chipRowFloor * t.layout.chipRowLines + t.space.sm * (t.layout.chipRowLines - 1);

/**
 * The viewports asserted. 768 is the floor the property is stated against --
 * the shortest the panel is ever asked to be -- and 800 is the wall panel's
 * own native size. A fit that holds at the floor holds above it, so these two
 * bracket the range rather than sampling it.
 */
const VIEWPORTS = [
  { w: 1280, h: 768, why: 'the supported floor' },
  { w: 1280, h: 800, why: 'the wall panel, natively' },
];

/**
 * The fixture's own content, as markup.
 *
 * Not arbitrary sample text: these are the entities `fake-house/manifest.yaml`
 * places in `glance` and `left` on `page:main`, with the strings the
 * panel actually renders ("Un guasto" is `houseReport`'s fault headline,
 * "Nessun movimento" is `CameraGlance`'s quiet state). Two chips rather than
 * one because that is what the house reports today, and the chip row's height
 * is the one thing house state can change.
 */
type ChipSpec = { text: string; fault: boolean };

/**
 * The two chip sets asserted.
 *
 * `quiet` is what `fake-house/manifest.yaml` reports today. `busy` adds the
 * third concern that exposed the width defect: `ChipRow`'s chips are
 * `nowrap`, so their combined intrinsic width became the left column's
 * `min-width: auto` floor and widened the column from 420 to 440 px,
 * shoving `right` sideways. House state must change what the panel
 * *says*, never the geometry it says it in -- which is ADR-0007's property
 * for the column's height, asserted here for its width too.
 */
const CHIP_SETS: Record<string, ChipSpec[]> = {
  quiet: [
    { text: 'Un guasto', fault: true },
    { text: 'Disinserito', fault: false },
  ],
  busy: [
    { text: 'Un guasto', fault: true },
    { text: 'Un accesso aperto', fault: false },
    { text: 'Disinserito', fault: false },
  ],
};

function leftColumn(chips: ChipSpec[]): string {
  const chip = (text: string, fault: boolean) => `
    <div class="chip" style="
      display:inline-flex; align-items:center; gap:${t.space.sm}px;
      padding:${t.space.sm}px ${t.space.md}px; border-radius:${t.radius.pill}px;
      border:${fault ? `2px solid ${t.color.fault}` : `1px solid ${t.color.border}`};
      color:${fault ? t.color.fault : t.color.textSecondary};
      font-size:${t.font.body}px; font-weight:${fault ? 700 : 400}; white-space:nowrap;
    "><span style="width:20px;height:20px;flex:0 0 20px;background:currentColor;border-radius:50%"></span>${text}</div>`;

  const slab = (name: string) => `
    <div class="slab" style="
      flex:0 0 auto; height:${t.layout.gateSlab}px; box-sizing:border-box;
      border-radius:${t.radius.tile}px; background:${t.color.activeStrong};
      padding:${t.space.md}px; display:flex; flex-direction:row;
      align-items:center; justify-content:center; position:relative;
      color:${t.color.onActiveStrong};
    ">
      <span style="
        position:absolute; left:${t.space.xl}px; top:50%; transform:translateY(-50%);
        width:48px;height:48px;display:block;background:currentColor;border-radius:4px
      "></span>
      <div style="
        display:flex;flex-direction:column;align-items:center;min-width:0;
        width:100%; padding-left:${t.space.xl + 48}px; padding-right:${t.space.xl + 48}px;
        box-sizing:border-box;
      ">
        <span style="font-size:${t.font.glanceL}px;font-weight:600;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${name}</span>
        <span style="font-size:${t.font.body}px">Chiuso</span>
      </div>
    </div>`;

  return `
  <div id="left-col" style="
    flex:0 0 ${t.layout.leftColW}px; display:flex; flex-direction:column;
    gap:${t.space.sm}px; min-height:0;
  ">
    <!--
      glance: holds its measured height and never scrolls (ADR-0007's
      inversion) -- flex:0 0 auto, so it takes what its contents need and the
      column's spare room goes to left instead. Panel.tsx is the
      source of this shape; keep the two in step.
    -->
    <div id="glance" style="flex:0 0 auto; min-height:0; display:flex; flex-direction:column; gap:${t.space.sm}px">
      <div id="hero" style="flex-shrink:0">
        <!-- No negative margins: the box is the ink (ADR-0007). -->
        <div id="hero-number" style="
          font-size:${t.font.hero}px; font-weight:200; line-height:1.15;
          letter-spacing:-3px; color:${t.color.textPrimary};
        ">21°</div>
        <div style="font-size:${t.font.glanceM}px; color:${t.color.textSecondary}; margin-top:${t.space.sm}px">47% umidità</div>
      </div>
      <!--
        The chip row is bounded to one line and scrolls horizontally within it
        (ADR-0007), so house state can never change the column's height.
      -->
      <div id="chips" style="
        flex:0 0 ${CHIP_BOX_H}px; height:${CHIP_BOX_H}px;
        display:flex; flex-wrap:wrap; gap:${t.space.sm}px;
        overflow-x:hidden; overflow-y:auto;
        scroll-snap-type:y mandatory; align-content:flex-start;
      ">${chips.map(c => chip(c.text, c.fault)).join('')}</div>
      <div id="stats" style="flex-shrink:0; display:flex; gap:${t.space.xl}px">
        <div>
          <div style="font-size:${t.font.glanceL}px;font-weight:600;color:${t.color.textPrimary}">0</div>
          <div style="font-size:${t.font.caption}px;color:${t.color.textSecondary};text-transform:uppercase;letter-spacing:1px">luci accese</div>
        </div>
        <div>
          <div style="font-size:${t.font.glanceL}px;font-weight:600;color:${t.color.textPrimary}">320<span style="font-size:${t.font.body}px;color:${t.color.textSecondary}"> W</span></div>
          <div style="font-size:${t.font.caption}px;color:${t.color.textSecondary};text-transform:uppercase;letter-spacing:1px">consumo</div>
        </div>
      </div>
    </div>

    <!--
      left: the region that yields (ADR-0007). It is the scroller when
      the column overflows, which is why the overflow assertion below exempts
      it and asserts the fade affordance instead.
    -->
    <div id="left" style="
      flex:0 1 auto; margin-top:auto; min-height:0; overflow-y:auto;
      display:flex; flex-direction:column; gap:${t.space.sm}px;
    ">
      ${slab('Cancello')}${slab('Cancelletto')}
      <div id="camera-glance" style="
        flex:0 0 auto; border-radius:${t.radius.tile}px; background:${t.color.surface};
        padding:${t.space.md}px ${t.space.lg}px; box-sizing:border-box;
        display:flex; flex-direction:column; justify-content:center; gap:${t.space.xs}px;
      ">
        <div style="display:flex;align-items:center;gap:${t.space.sm}px">
          <span style="width:32px;height:32px;flex:0 0 32px;display:block;background:${t.color.textSecondary};border-radius:4px"></span>
          <span style="font-size:${t.font.glanceM}px;font-weight:600;color:${t.color.textPrimary}">3 camere</span>
        </div>
        <span style="font-size:${t.font.body}px;color:${t.color.textPrimary};opacity:.85">Nessun movimento</span>
      </div>
    </div>
  </div>`;
}

/** The whole panel, so the left column is measured inside the real shell. */
function panel(chips: ChipSpec[]): string {
  return `<body style="margin:0;font-family:${t.font.family};background:${t.color.ground}">
    <div id="panel" style="
      display:flex; flex-direction:column; gap:${t.space.lg}px; padding:${t.space.lg}px;
      width:100%; height:100vh; box-sizing:border-box; overflow:auto;
    ">
      <div style="display:flex; flex:1; gap:${t.space.lg}px; min-height:0">
        ${leftColumn(chips)}
        <div id="right" style="flex:1; min-height:0; overflow:auto"></div>
      </div>
      <div id="footer" style="flex-shrink:0; min-height:${t.layout.footerH}px"></div>
    </div>
  </body>`;
}

type Failure = { viewport: string; rule: string; detail: string };

/**
 * The two assertions, run in the page.
 *
 * `left` is deliberately exempt from the scroll rule: it is the
 * region that yields by design (ADR-0007), so it scrolling is the intended
 * behaviour rather than the defect. Everything else in the column scrolling
 * means the column does not fit.
 */
const probe = `(() => {
  const OVERLAP_TOLERANCE = 0.5;
  const LEFT_COL_W = ${t.layout.leftColW};
  const failures = [];
  const col = document.getElementById('left-col');
  if (col === null) return [{ rule: 'setup', detail: 'no #left-col in the page' }];

  // Rule 1: nothing in the left column scrolls, except the region that yields.
  for (const el of [col, ...col.querySelectorAll('*')]) {
    if (el.id === 'left' || el.id === 'chips') continue;
    const over = el.scrollHeight - el.clientHeight;
    if (over > OVERLAP_TOLERANCE) {
      const what = el.id !== '' ? '#' + el.id : el.tagName.toLowerCase() + '.' + el.className;
      failures.push({ rule: 'no scrollers in the left column', detail: what + ' overflows by ' + over + 'px' });
    }
  }

  // Rule 2: no two siblings overlap. Walks every parent in the column and
  // compares each child's painted rect against the next one's -- which is what
  // catches ink pulled outside its own box by a negative margin, and what a
  // scrollHeight probe alone is blind to.
  const parents = [col, ...col.querySelectorAll('*')].filter(e => e.children.length > 1);
  for (const parent of parents) {
    // Out-of-flow children are not stacked with anything, so the rule below
    // does not apply to them: the gate slab's icon is positioned absolutely
    // in its own reserved lane (GateSlab.tsx), and its rect legitimately
    // overlaps the centred label whose padding keeps that lane clear. Left
    // in, it reported 54.4 px of "overlap" where no ink can ever collide.
    // Only "position: absolute" is excluded, not "relative": a relatively
    // positioned element still occupies its place in the flow, so nudging
    // one over its neighbour is a real overlap this must still catch.
    const kids = [...parent.children].filter(k => getComputedStyle(k).position !== 'absolute');
    for (let i = 0; i < kids.length - 1; i++) {
      const a = kids[i].getBoundingClientRect();
      const b = kids[i + 1].getBoundingClientRect();
      // Only vertically stacked siblings are checked. Horizontal rows -- the
      // chip row, the two Stats, the icon and label inside a slab -- sit side
      // by side by design, and their rects legitimately share the same band of
      // y. Stacking is therefore decided by horizontal separation, not by
      // comparing tops: if the two rects overlap horizontally at all, they are
      // in the same column and one is genuinely below the other; if they do
      // not, they are a row and there is nothing to check.
      const sameColumn = a.left < b.right - OVERLAP_TOLERANCE && b.left < a.right - OVERLAP_TOLERANCE;
      const overlap = a.bottom - b.top;
      if (sameColumn && overlap > OVERLAP_TOLERANCE) {
        const name = e => (e.id !== '' ? '#' + e.id : e.tagName.toLowerCase() + '.' + e.className);
        failures.push({
          rule: 'no overlapping siblings',
          detail: name(kids[i]) + ' paints ' + overlap.toFixed(1) + 'px over ' + name(kids[i + 1]),
        });
      }
    }
  }
  // Rule 3: the column is exactly as wide as the token says.
  //
  // "flex: 0 0 <w>" does not guarantee this on its own -- a flex item's
  // "min-width" defaults to its content's minimum, which for a row of
  // nowrap chips is the sum of all of them, and that floor beats the basis.
  // Asserted against the token rather than against the other chip set, so a
  // failure names the width it should have been.
  const declared = LEFT_COL_W;
  const actual = col.getBoundingClientRect().width;
  if (Math.abs(actual - declared) > OVERLAP_TOLERANCE) {
    failures.push({
      rule: 'the left column holds its width',
      detail: '#left-col is ' + actual.toFixed(1) + 'px, not the declared ' + declared + 'px',
    });
  }

  return failures;
})()`;

/**
 * Reports what the column *needs* versus what it *has*, pass or fail. The
 * headroom number is the point of ADR-0007's "shrink then scroll": a fit with
 * single-digit slack is one wrapped chip away from the defect, so the margin
 * is worth printing even on a green run.
 */
const headroom = `(() => {
  const glance = document.getElementById('glance');
  const leftEl = document.getElementById('left');
  if (glance === null || leftEl === null) return null;
  return {
    glanceNeeds: glance.scrollHeight,
    glanceHas: glance.clientHeight,
    slack: glance.clientHeight - glance.scrollHeight,
    leftNeeds: leftEl.scrollHeight,
    leftHas: leftEl.clientHeight,
  };
})()`;

const executablePath = process.env.CHROME;
if (executablePath === undefined || executablePath === '') {
  console.error(
    'No CHROME set. Run inside `nix develop` (flake.nix exports it), or point CHROME at a Chromium binary.\n' +
      "Playwright's own bundled Chromium does not run on NixOS."
  );
  process.exit(2);
}

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-gpu'] });
const failures: Failure[] = [];

for (const { w, h, why } of VIEWPORTS) {
  for (const [setName, chips] of Object.entries(CHIP_SETS)) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(panel(chips));
  const found = (await page.evaluate(probe)) as { rule: string; detail: string }[];
  const space = (await page.evaluate(headroom)) as {
    glanceNeeds: number;
    glanceHas: number;
    slack: number;
    leftNeeds: number;
    leftHas: number;
  } | null;
  const label = `${w}x${h} ${setName}`;

  if (found.length === 0) {
    console.log(`  PASS  ${label}  (${why})`);
  } else {
    console.log(`  FAIL  ${label}  (${why})`);
    for (const f of found) failures.push({ viewport: label, ...f });
  }
  if (space !== null) {
    console.log(
      `        glance needs ${space.glanceNeeds} / has ${space.glanceHas} (${space.slack >= 0 ? '+' : ''}${space.slack}px slack)` +
        `, left needs ${space.leftNeeds} / has ${space.leftHas}`
    );
  }
  await page.close();
  }
}

await browser.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ${f.viewport}  ${f.rule}: ${f.detail}`);
  process.exit(1);
}
console.log('\nThe left column fits at every asserted viewport.');
