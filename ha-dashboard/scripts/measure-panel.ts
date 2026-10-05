/**
 * The panel's fit, asserted rather than claimed (ADR-0007).
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
 * Since #32, the footer, and since #41 the frame around it all -- a status
 * bar, the body, and the floor (`Panel.tsx`):
 *
 *   3. **The busy floor fits.** Beside the Dock, `MediaBar` (with its
 *      chevron to `page:media`) and one Area block sit in one strip with
 *      nothing scrolled, clipped or taller than the floor, and the strip
 *      keeps at least `mediaBarMinW`. The Dock -- Casa and the fixture's four
 *      Page Openers -- shows every item whole.
 *   4. **An overfull footer scrolls rather than clips.** With more blocks
 *      than fit, the strip beside the Dock scrolls sideways, every block
 *      keeps its whole label, the strip still keeps `mediaBarMinW`, and the
 *      Dock is not squeezed.
 *   5. **The status bar holds its height.** The Clock and the chips share
 *      one line; however many chips there are, the bar stays
 *      `statusBarHeight`, the chips never paint over the Clock, and the
 *      ones that do not fit scroll.
 *
 * All of it is asserted at 1280x768 (the shortest supported) and 1280x800 (the
 * wall panel's native size). Stated as a property of every viewport >= the
 * floor rather than a list of samples, because a fit proven on samples and
 * broken between them is exactly how the defect in ADR-0007 reached the wall.
 *
 * ## Why a reproduction and not the app
 *
 * The real app needs a live Home Assistant (`.env` -> `VITE_HA_URL`), so
 * driving it here would make a layout check depend on the house being up. This
 * builds the panel's *shape* from the same tokens the components import,
 * with the fixture's own content (the Accessi card's two gates, three cameras, the two chips in
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
 * places in `glance` and `left` on `page:main` -- the gates in `left`, and
 * since #29 the cameras in `glance` as its camera tile -- with the strings the
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
 * third concern that once exposed a width defect, when the chips lived in the
 * left column: their combined `nowrap` width became the column's
 * `min-width: auto` floor and shoved `right` sideways. `overfull` is more
 * than the status bar holds. House state must change what the panel *says*,
 * never the geometry it says it in.
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
  overfull: [
    { text: 'Tre guasti', fault: true },
    { text: 'Due accessi aperti', fault: false },
    { text: 'Quattro luci accese', fault: false },
    { text: 'Inserito fuori casa', fault: false },
    { text: 'Un altro avviso ancora', fault: false },
  ],
};

/**
 * The status bar (#41): the Clock on the left, `ChipRow` on the right as one
 * line that scrolls sideways past what fits.
 */
function statusBar(chips: ChipSpec[]): string {
  const chip = (text: string, fault: boolean) => `
    <div class="chip" style="
      display:inline-flex; align-items:center; gap:${t.space.sm}px;
      padding:${t.space.sm}px ${t.space.md}px; border-radius:${t.radius.pill}px;
      border:${fault ? `2px solid ${t.color.fault}` : `1px solid ${t.color.border}`};
      color:${fault ? t.color.fault : t.color.textSecondary};
      font-size:${t.font.body}px; font-weight:${fault ? 700 : 400}; white-space:nowrap;
      flex:0 0 auto; scroll-snap-align:start;
    "><span style="width:20px;height:20px;flex:0 0 20px;background:currentColor;border-radius:50%"></span>${text}</div>`;

  return `
  <div id="status" style="flex:0 0 ${t.size.statusBarHeight}px; display:flex; align-items:center; gap:${t.space[6]}px; min-width:0">
    <div id="clock" style="flex:0 0 auto; display:flex; align-items:baseline; gap:${t.space.md}px; white-space:nowrap">
      <span style="font-size:${t.type.clock.size}px; line-height:${t.type.clock.lineHeight}; font-weight:${t.type.clock.weight}">21:45</span>
      <span style="font-size:${t.type.bodyLg.size}px; line-height:${t.type.bodyLg.lineHeight}">Mercoledì 30 settembre</span>
    </div>
    <div style="flex:1; min-width:0; display:flex; justify-content:flex-end">
      <div id="chips" style="
        display:flex; gap:${t.space.sm}px; min-width:0; overflow-x:auto; overflow-y:hidden;
        scroll-snap-type:x mandatory; scrollbar-width:none;
      ">${chips.map(c => chip(c.text, c.fault)).join('')}</div>
    </div>
  </div>`;
}

function leftColumn(): string {
  // The Accessi card (#43): `Card.tsx` with a `SectionLabel`, and an
  // `AccessRow` per gate, a hairline between them.
  const row = (name: string) => `
    <div class="access-row" style="display:flex; align-items:center; gap:14px; padding:10px 6px 10px 10px; min-width:0">
      <span style="width:48px;height:48px;flex:0 0 48px;display:block;border-radius:${t.radius.well}px;background:${t.color.surfaceWell}"></span>
      <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:2px">
        <span style="font-size:${t.type.rowTitle.size}px;line-height:${t.type.rowTitle.lineHeight};font-weight:${t.type.rowTitle.weight};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${t.color.ink}">${name}</span>
        <span style="font-size:${t.type.meta.size}px;line-height:${t.type.meta.lineHeight};white-space:nowrap;overflow:hidden;color:${t.color.inkMuted}">Chiuso</span>
      </div>
      <span style="flex:0 0 auto; height:${t.size.targetControl}px; min-width:108px; padding:0 22px; box-sizing:border-box; border-radius:${t.radius.pill}px; background:${t.color.primary}; color:${t.color.onPrimary}; display:inline-flex; align-items:center; justify-content:center; font-size:${t.type.bodyLg.size}px; font-weight:600">Apri</span>
    </div>`;
  const accessCard = (names: string[]) => `
    <section id="accessi" style="
      flex:0 0 auto; min-width:0; display:flex; flex-direction:column; box-sizing:border-box;
      padding:6px ${t.space[2]}px; border-radius:${t.radius.tile}px;
      background:${t.color.surface}; border:1px solid ${t.color.line};
    ">
      <div style="padding:12px 12px 4px; font-size:${t.type.label.size}px; line-height:${t.type.label.lineHeight}; font-weight:${t.type.label.weight}; letter-spacing:${t.type.label.letterSpacing}; text-transform:uppercase; color:${t.color.inkMuted}">Accessi</div>
      ${names.map(row).join(`<div style="height:1px; background:${t.color.line}; margin:0 10px; flex-shrink:0"></div>`)}
    </section>`;

  return `
  <div id="left-col" style="
    flex:0 0 ${t.size.sidebarWidth}px; min-width:0; display:flex; flex-direction:column;
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
      <!--
        The camera glance (#29): the fixture's cameras are Placed in \`glance\`
        now, rendered under the stats. A control since it opens the cameras'
        Page, so its padding is \`sm\` rather than \`md\` -- 74 px, over
        \`touch.primary\` and 12 px under what \`md\` cost, which the column did
        not have at 768.
      -->
      <div id="camera-glance" style="
        flex:0 0 auto; border-radius:${t.radius.tile}px; background:${t.color.surface};
        border:1px solid ${t.color.border};
        padding:${t.space.sm}px ${t.space.lg}px; box-sizing:border-box;
        display:flex; flex-direction:column; justify-content:center; gap:${t.space.xs}px;
      ">
        <div style="display:flex;align-items:center;gap:${t.space.sm}px">
          <span style="width:32px;height:32px;flex:0 0 32px;display:block;background:${t.color.textSecondary};border-radius:4px"></span>
          <span style="font-size:${t.font.glanceM}px;font-weight:600;color:${t.color.textPrimary}">3 camere</span>
        </div>
        <span style="font-size:${t.font.body}px;color:${t.color.textPrimary};opacity:.85">Nessun movimento</span>
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
      ${accessCard(['Cancello', 'Cancelletto'])}
    </div>
  </div>`;
}

/**
 * The floor, as `Panel.tsx`, `PlacementView.tsx` and `Dock.tsx` build it: on
 * the left a strip that scrolls sideways with snapping, `PageBlock`s sized to
 * their labels, and `MediaBar` inside a `FooterMember` -- the swipe surface
 * and the chevron to the Page it is also Placed on (#32); on the right the
 * Dock (#41), Casa then the Page Openers, 100 px each. The strip plays
 * something, since its playing form is the wider one, with a title longer
 * than it can show: a title must ellipsise, never widen the strip into a
 * scroll.
 */
function floor(blocks: { name: string }[], dock: string[]): string {
  const block = (name: string) => `
    <div class="footer-item" style="display:flex; flex:0 0 auto; min-width:0; scroll-snap-align:start">
      <div class="block" style="
        box-sizing:border-box; border:1px solid ${t.color.border}; border-radius:${t.radius.tile}px;
        background:${t.color.surface}; padding:${t.space.sm}px ${t.space.md}px; overflow:hidden;
        min-height:${t.touch.primary}px; display:block; width:100%; min-width:0;
      ">
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:${t.space.xs}px; color:${t.color.textPrimary}">
          <span style="width:26px;height:26px;flex:0 0 26px;display:block;background:currentColor;border-radius:4px"></span>
          <span style="font-size:${t.font.caption}px; font-weight:600; text-align:center; white-space:nowrap">${name}</span>
        </div>
      </div>
    </div>`;
  const button = `<span style="width:${t.touch.floor}px;height:${t.touch.floor}px;flex:0 0 ${t.touch.floor}px;display:flex;align-items:center;justify-content:center"><span style="width:28px;height:28px;display:block;background:${t.color.onActiveStrong};border-radius:4px"></span></span>`;
  const media = `
    <div id="media" class="footer-item" style="flex:1; scroll-snap-align:start; display:flex; position:relative; overflow:clip">
      <div style="flex:1; min-width:0; display:flex">
        <div style="flex:1; min-width:0; display:flex">
          <div id="media-bar" style="flex:1; min-width:${t.layout.mediaBarMinW}px; display:flex">
            <div style="
              box-sizing:border-box; width:100%; min-height:${t.touch.primary}px; max-height:${t.layout.tileMaxH}px;
              border:1px solid ${t.color.border}; border-radius:${t.radius.tile}px; background:${t.color.activeStrong};
              padding:${t.space.sm}px ${t.space.md}px; overflow:hidden; color:${t.color.onActiveStrong};
            ">
              <div style="display:flex; align-items:center; gap:${t.space.md}px; height:100%">
                <span style="width:32px;height:32px;flex:0 0 32px;display:block;background:currentColor;border-radius:4px"></span>
                <div style="flex:1; min-width:0; contain:inline-size">
                  <div style="font-size:${t.font.glanceM}px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">Concerto per pianoforte e orchestra n. 21 in do maggiore, K. 467 — Wolfgang Amadeus Mozart</div>
                  <div style="font-size:${t.font.caption}px; opacity:.85">Ovunque</div>
                </div>
                <div id="transport" style="display:flex; gap:${t.space.sm}px; flex-shrink:0">${button}${button}${button}</div>
              </div>
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center">
          <span id="chevron" style="flex-shrink:0; width:${t.touch.floor}px; height:${t.touch.floor}px; display:block"></span>
        </div>
      </div>
    </div>`;
  const PAD = 6;
  const item = (name: string, current: boolean) => `
    <div class="dock-item" style="
      width:100px; flex-shrink:0; border-radius:${t.radius.dock - PAD}px;
      background:${current ? t.color.primary : 'transparent'}; color:${current ? t.color.onPrimary : t.color.inkSecondary};
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px;
      font-size:${t.type.label.size}px; line-height:${t.type.label.lineHeight}; font-weight:${current ? 600 : 500}; white-space:nowrap;
    "><span style="width:22px;height:22px;display:block;background:currentColor;border-radius:4px"></span>${name}</div>`;
  return `
    <div id="floor" style="flex:0 0 auto; min-height:${t.size.dockHeight}px; display:flex; gap:${t.space[3]}px; min-width:0">
      <div id="footer" style="
        flex:1; min-width:0; display:flex; align-items:stretch; gap:${t.space.sm}px;
        overflow-x:auto; overflow-y:hidden; scroll-snap-type:x mandatory; scrollbar-width:none;
      ">${block(blocks[0].name)}${media}${blocks
        .slice(1)
        .map(b => block(b.name))
        .join('')}</div>
      <div id="dock" style="
        flex:0 0 auto; display:flex; gap:${t.space[1]}px; padding:${PAD}px; box-sizing:border-box;
        height:${t.size.dockHeight}px; border-radius:${t.radius.dock}px; background:${t.color.surface};
        border:1px solid ${t.color.line};
      ">${dock.map((name, i) => item(name, i === 0)).join('')}</div>
    </div>`;
}

/**
 * The floors asserted. `busy` is what `fake-house/manifest.yaml` Places in
 * `page:main:footer` once every Topic Page has its Opener (#32): Corridoio
 * and Ovunque's strip beside the Dock, and the four Openers in it after Casa.
 * `overfull` is a house that places more than fits beside it, which must
 * scroll rather than clip.
 */
const BUSY_FOOTER = [{ name: 'Corridoio' }];
const DOCK = ['Casa', 'Clima', 'Sicurezza', 'Media', 'Servizi'];
const FOOTERS: Record<string, { blocks: { name: string }[]; fits: boolean }> = {
  busy: { blocks: BUSY_FOOTER, fits: true },
  overfull: {
    blocks: [...BUSY_FOOTER, ...['Soggiorno', 'Cucina', 'Cameretta', 'Ingresso', 'Esterno', 'Ufficio'].map(name => ({ name }))],
    fits: false,
  },
};

/** The whole panel, so each band is measured inside the real frame. */
function panel(chips: ChipSpec[], footerBlocks: { name: string }[] = BUSY_FOOTER): string {
  return `<body style="margin:0;font-family:${t.font.family};background:${t.color.ground}">
    <div id="panel" style="
      display:flex; flex-direction:column; gap:${t.space[5]}px; padding:${t.space[6]}px ${t.space[7]}px;
      width:100%; height:100vh; box-sizing:border-box; overflow:auto;
    ">
      ${statusBar(chips)}
      <div style="display:flex; flex:1; gap:${t.space[6]}px; min-height:0">
        ${leftColumn()}
        <div id="right" style="flex:1; min-height:0; overflow:auto"></div>
      </div>
      ${floor(footerBlocks, DOCK)}
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
  const LEFT_COL_W = ${t.size.sidebarWidth};
  const failures = [];
  const col = document.getElementById('left-col');
  if (col === null) return [{ rule: 'setup', detail: 'no #left-col in the page' }];

  // Rule 1: nothing in the left column scrolls, except the region that yields.
  for (const el of [col, ...col.querySelectorAll('*')]) {
    if (el.id === 'left') continue;
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
    // does not apply to them. This was written for the gate slab's icon,
    // positioned absolutely in its own reserved lane (the deleted
    // GateSlab.tsx), whose rect overlapped the centred label that its padding
    // kept clear: left in, it reported 54.4 px of "overlap" where no ink could
    // ever collide. Apri's hold sweep (AccessRow.tsx) is the same kind of
    // layer, under its label by design.
    // Only "position: absolute" is excluded, not "relative": a relatively
    // positioned element still occupies its place in the flow, so nudging
    // one over its neighbour is a real overlap this must still catch.
    const kids = [...parent.children].filter(k => getComputedStyle(k).position !== 'absolute');
    for (let i = 0; i < kids.length - 1; i++) {
      const a = kids[i].getBoundingClientRect();
      const b = kids[i + 1].getBoundingClientRect();
      // Only vertically stacked siblings are checked. Horizontal rows -- the
      // chip row, the two Stats, the well, the name and Apri inside a gate's row -- sit side
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

  // Rule 5: the status bar holds its height, and the chips stay on its one
  // line, beside the Clock rather than over it -- scrolling sideways when
  // there are more than fit.
  const status = document.getElementById('status').getBoundingClientRect();
  if (Math.abs(status.height - ${t.size.statusBarHeight}) > OVERLAP_TOLERANCE) {
    failures.push({ rule: 'the status bar holds its height', detail: '#status is ' + status.height.toFixed(1) + 'px, not ${t.size.statusBarHeight}' });
  }
  const chipsEl = document.getElementById('chips');
  const chipBox = chipsEl.getBoundingClientRect();
  if (chipBox.top < status.top - OVERLAP_TOLERANCE || chipBox.bottom > status.bottom + OVERLAP_TOLERANCE) {
    failures.push({ rule: 'the chips stay in the status bar', detail: '#chips spans ' + chipBox.top + '-' + chipBox.bottom + ', the bar ' + status.top + '-' + status.bottom });
  }
  if (chipsEl.scrollHeight - chipsEl.clientHeight > OVERLAP_TOLERANCE) {
    failures.push({ rule: 'the chips are one line', detail: '#chips overflows by ' + (chipsEl.scrollHeight - chipsEl.clientHeight) + 'px' });
  }
  const clockBox = document.getElementById('clock').getBoundingClientRect();
  if (chipBox.left < clockBox.right - OVERLAP_TOLERANCE) {
    failures.push({ rule: 'the chips clear the Clock', detail: '#chips starts at ' + chipBox.left + ', the Clock ends at ' + clockBox.right });
  }

  return failures;
})()`;

/**
 * The floor's assertions (#32, #41). `fits` says which footer this is: the
 * busy one must not scroll at all; the overfull one must, and only sideways.
 * Either way no block is clipped, the floor holds `dockHeight`, `MediaBar`
 * keeps its floor, and the Dock shows every item whole.
 */
const footerProbe = (fits: boolean) => `(() => {
  const TOLERANCE = 0.5;
  const failures = [];
  const footer = document.getElementById('footer');
  const bar = document.getElementById('media-bar');
  if (footer === null || bar === null) return [{ rule: 'setup', detail: 'no #footer or #media-bar in the page' }];

  const scrolls = footer.scrollWidth - footer.clientWidth > TOLERANCE;
  if (${fits} && scrolls) {
    failures.push({ rule: 'the busy footer fits', detail: '#footer scrolls by ' + (footer.scrollWidth - footer.clientWidth) + 'px' });
  }
  if (!${fits} && !scrolls) {
    failures.push({ rule: 'an overfull footer scrolls', detail: '#footer holds ' + footer.scrollWidth + 'px in ' + footer.clientWidth + 'px without scrolling' });
  }
  const height = document.getElementById('floor').getBoundingClientRect().height;
  if (Math.abs(height - ${t.size.dockHeight}) > TOLERANCE) {
    failures.push({ rule: 'the floor holds its height', detail: '#floor is ' + height.toFixed(1) + 'px, not ${t.size.dockHeight}' });
  }
  const dock = document.getElementById('dock');
  if (dock.scrollWidth - dock.clientWidth > TOLERANCE) {
    failures.push({ rule: 'the Dock is not squeezed', detail: '#dock needs ' + dock.scrollWidth + ', has ' + dock.clientWidth });
  }
  for (const el of dock.querySelectorAll('.dock-item')) {
    const w = el.getBoundingClientRect().width;
    if (Math.abs(w - 100) > TOLERANCE || el.scrollWidth - el.clientWidth > TOLERANCE || el.scrollHeight - el.clientHeight > TOLERANCE) {
      failures.push({ rule: 'every Dock item is whole', detail: el.textContent.trim() + ' is ' + w.toFixed(1) + 'px wide, needs ' + el.scrollWidth + 'x' + el.scrollHeight });
    }
  }
  for (const el of footer.querySelectorAll('.block')) {
    const label = el.textContent.trim();
    if (el.scrollWidth - el.clientWidth > TOLERANCE || el.scrollHeight - el.clientHeight > TOLERANCE) {
      failures.push({ rule: 'no block is clipped', detail: label + ' needs ' + el.scrollWidth + 'x' + el.scrollHeight + ', has ' + el.clientWidth + 'x' + el.clientHeight });
    }
  }
  const barW = bar.getBoundingClientRect().width;
  if (barW < ${t.layout.mediaBarMinW} - TOLERANCE) {
    failures.push({ rule: 'MediaBar keeps its floor', detail: '#media-bar is ' + barW.toFixed(1) + 'px, under ${t.layout.mediaBarMinW}' });
  }
  const chevron = document.getElementById('chevron').getBoundingClientRect();
  const transport = document.getElementById('transport').getBoundingClientRect();
  if (chevron.left < transport.right - TOLERANCE) {
    failures.push({ rule: 'the chevron clears the transport', detail: 'chevron at ' + chevron.left + ', transport ends at ' + transport.right });
  }
  return failures;
})()`;

/** How wide the footer's strip came out, pass or fail. */
const footerSpace = `(() => {
  const footer = document.getElementById('footer');
  const bar = document.getElementById('media-bar');
  return { needs: footer.scrollWidth, has: footer.clientWidth, bar: Math.round(bar.getBoundingClientRect().width) };
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
  for (const [footerName, { blocks, fits }] of Object.entries(FOOTERS)) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(panel(CHIP_SETS.quiet, blocks));
    const found = (await page.evaluate(footerProbe(fits))) as { rule: string; detail: string }[];
    const space = (await page.evaluate(footerSpace)) as { needs: number; has: number; bar: number };
    const label = `${w}x${h} ${footerName} footer`;
    if (found.length === 0) {
      console.log(`  PASS  ${label}  (${why})`);
    } else {
      console.log(`  FAIL  ${label}  (${why})`);
      for (const f of found) failures.push({ viewport: label, ...f });
    }
    console.log(`        footer needs ${space.needs} / has ${space.has}, MediaBar ${space.bar}px`);
    await page.close();
  }
}

await browser.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ${f.viewport}  ${f.rule}: ${f.detail}`);
  process.exit(1);
}
console.log('\nThe status bar, the left column and the floor fit at every asserted viewport.');
