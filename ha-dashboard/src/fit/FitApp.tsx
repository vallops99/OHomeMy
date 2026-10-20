/**
 * The Widget fit check's page (#72), driven by `scripts/fit-widgets.ts`;
 * a root of its own, as `App` is, so it opens @hakit's connection itself.
 *
 * It mounts the real kinds -- each kind's `Component` and `css`, from the
 * registry -- in sized `.ohm-widget` boxes, on entities from Home Assistant
 * as the app gets them (`HassConnect`, the dev server's URL and token), in
 * the language `?lang=` names. Each box is a probe: a kind's Smallest box,
 * or the lowest box of one of its layout steps (`WidgetKind.steps`).
 *
 * A probe fits when its content shows whole, by `builder/fit.ts`'s rule, in
 * its box less `WIDGET_HEADROOM_PX` on every axis it guards. The rule is
 * given every element that hides what it holds, not only the scrollers the
 * Builder gives it: a card that clips (`overflow: hidden`) hides content as
 * surely as one that scrolls, with nothing to scroll, so the Builder cannot
 * see it. Text that ends in an ellipsis is still a kind's own way to shrink.
 *
 * What every element holds is read off its descendants' boxes, not only a
 * scroller's scroll size: content centred in a card that is too short
 * spills up as much as down, and the spill upwards never adds to a scroll
 * size; and an element's padding is part of what its content needs, so
 * content that crowds into it, or out of an element that does not clip,
 * no longer fits. A descendant placed absolutely (a dimmer's fill, a
 * range input laid over it) is a decoration of its box, not content; and
 * one with a negative margin is measured without it, since that is a
 * layout's way of saying it may overhang (a switch's touch target reaching
 * into a card's padding, a number set optically flush). The box itself
 * keeps its size, so its container queries see what they would see on the
 * wall; only the content is given less room, by a wrapper between the box
 * and the kind's root. The room to spare is how much less it can be given,
 * each axis on its own.
 *
 * The answer is left on `window.__fit` for the runner to read.
 */
import { HassConnect } from '@hakit/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fits, type Extent } from '../builder/fit';
import { validateWidget, type Variant } from '../document/schema';
import type { Dashboard, Widget } from '../document/types';
import { useEntities, useHouse } from '../ha';
import { DEFAULT_LOCALE, scriptFont, setViewerLocale, viewerDirection, type Language } from '../i18n';
import { DashboardConcerns } from '../renderer/concerns';
import { RENDERER_CSS } from '../renderer/grid';
import { themeCss } from '../theme/themes';
import { CASA } from '../theme/tokens';
import { HakitTheme } from '../ui';
import { WIDGET_HEADROOM_PX } from '../ui/vars';
import { WIDGETS_CSS, widgetKind, widgetSchemas } from '../widgets/registry';
import { FULLEST, type Measured, type Probe } from './cases';

declare global {
  interface Window {
    __fit?: { measured: Measured[]; missing: string[] } | { error: string };
    /** The least box this probe's kind fits in with the headroom, searched down from `start` (`npm run fit -- --least`). */
    __least?: (probeId: string, start: { width: number; height: number }) => Promise<{ width: number; height: number } | null>;
  }
}

const language = (new URLSearchParams(window.location.search).get('lang') ?? 'en') as Language;
setViewerLocale({ ...DEFAULT_LOCALE, language });

/** Every probe of every kind with a fullest Widget, and the kinds without one. */
function probes(): { probes: Probe[]; missing: string[] } {
  const out: Probe[] = [];
  const missing: string[] = [];
  for (const schema of widgetSchemas()) {
    const kind = widgetKind(schema.kind)!;
    if (!FULLEST[schema.kind]) {
      missing.push(`${schema.kind}: no fullest Widget in src/fit/cases.ts`);
      continue;
    }
    for (const variant of schema.variants) {
      const smallest = kind.smallest[variant];
      if (!smallest) {
        missing.push(`${schema.kind} ${variant}: no Smallest box`);
        continue;
      }
      const base = { kind: schema.kind, variant };
      out.push({ ...base, id: `${schema.kind}/${variant}/smallest`, name: 'Smallest box', ...smallest, guards: ['width', 'height'] });
      for (const step of kind.steps ?? []) {
        if (step.variants && !step.variants.includes(variant)) continue;
        out.push({ ...base, id: `${schema.kind}/${variant}/${step.name}`, name: step.name, ...step.box, guards: [step.guards] });
      }
    }
  }
  return { probes: out, missing };
}

const widgetOf = (probe: Probe): Widget => ({
  id: probe.id,
  kind: probe.kind,
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  variant: probe.variant,
  title: FULLEST[probe.kind].title ?? null,
  on_tap: null,
  settings: FULLEST[probe.kind].settings,
});

/** A Dashboard of every probe, for the Concerns the Chip Row and the Stats read. */
const dashboardOf = (widgets: Widget[]): Dashboard => ({
  id: 'fit',
  slug: 'fit',
  name: 'Fit',
  show_in_sidebar: false,
  home_page: 'fit',
  settings: {
    overflow: 'scroll',
    supported_range: { min: { width: 1, height: 1 }, max: { width: 9999, height: 9999 } },
    idle_return: null,
    back_history: false,
    theme: { name: 'casa-panel', mode: 'dark' },
  },
  navbar: null,
  pages: [{ id: 'fit', name: 'Fit', popup: null, grid: { columns: 1, rows: widgets.length }, widgets }],
});

const extent = (el: HTMLElement): Extent => ({
  clientWidth: el.clientWidth,
  clientHeight: el.clientHeight,
  scrollWidth: el.scrollWidth,
  scrollHeight: el.scrollHeight,
});

/** Whether the box's content shows whole with this much less room on each axis. */
function fitsWithLess(box: HTMLElement, wrapper: HTMLElement, less: { width: number; height: number }): boolean {
  wrapper.style.flex = `0 0 calc(100% - ${less.width}px)`;
  wrapper.style.height = `calc(100% - ${less.height}px)`;
  const all = [wrapper, ...wrapper.querySelectorAll<HTMLElement>('*')];
  const hiding = all.filter(hides);
  const laidOut = all.filter(boxed);
  return fits(extent(box), [...hiding.map(extent), ...laidOut.map(held)]);
}

/** Whether an element lays out content in a box of its own: not inline, not `display: contents`, and not text ending in an ellipsis. */
function boxed(el: HTMLElement): boolean {
  const s = getComputedStyle(el);
  return s.textOverflow !== 'ellipsis' && s.display !== 'inline' && s.display !== 'contents' && s.display !== 'none';
}

function hides(el: HTMLElement): boolean {
  const s = getComputedStyle(el);
  if (s.textOverflow === 'ellipsis') return false;
  return /auto|scroll|hidden|clip/.test(s.overflowX) || /auto|scroll|hidden|clip/.test(s.overflowY);
}

/**
 * What an element holds against the room inside its padding, as an
 * `Extent`: its content box, and the span of its in-flow descendants' boxes
 * and the content box together. A descendant is measured as a whole box
 * here, and what it holds is judged on its own.
 */
function held(el: HTMLElement): Extent {
  const s = getComputedStyle(el);
  const px = (v: string) => parseFloat(v) || 0;
  const r = el.getBoundingClientRect();
  const inner = {
    left: r.left + px(s.borderLeftWidth) + px(s.paddingLeft),
    right: r.right - px(s.borderRightWidth) - px(s.paddingRight),
    top: r.top + px(s.borderTopWidth) + px(s.paddingTop),
    bottom: r.bottom - px(s.borderBottomWidth) - px(s.paddingBottom),
  };
  const span = { ...inner };
  const walk = (parent: Element) => {
    for (const child of parent.children) {
      if (!(child instanceof HTMLElement)) continue;
      const cs = getComputedStyle(child);
      if (cs.position === 'absolute' || cs.position === 'fixed' || cs.display === 'none') continue;
      if (cs.display === 'contents') {
        walk(child);
        continue;
      }
      const r = child.getBoundingClientRect();
      const overhang = (v: string) => Math.max(0, -px(v));
      const c = {
        left: r.left + overhang(cs.marginLeft),
        right: r.right - overhang(cs.marginRight),
        top: r.top + overhang(cs.marginTop),
        bottom: r.bottom - overhang(cs.marginBottom),
      };
      if (r.width > 0 && r.height > 0) {
        span.left = Math.min(span.left, c.left);
        span.right = Math.max(span.right, c.right);
        span.top = Math.min(span.top, c.top);
        span.bottom = Math.max(span.bottom, c.bottom);
      }
      // Only an inline element's content flows out of it; what an
      // overhanging element holds overhangs with it.
      const overhangs = [cs.marginLeft, cs.marginRight, cs.marginTop, cs.marginBottom].some(m => px(m) < 0);
      if ((cs.display === 'inline' || cs.display === 'contents') && !overhangs) walk(child);
    }
  };
  walk(el);
  return {
    clientWidth: inner.right - inner.left,
    clientHeight: inner.bottom - inner.top,
    scrollWidth: span.right - span.left,
    scrollHeight: span.bottom - span.top,
  };
}

/** The most this axis can lose and still fit, the other unchanged; -1 when it does not fit as it is. */
function spareOn(box: HTMLElement, wrapper: HTMLElement, axis: 'width' | 'height', size: number): number {
  const less = (n: number) => fitsWithLess(box, wrapper, { width: axis === 'width' ? n : 0, height: axis === 'height' ? n : 0 });
  if (!less(0)) return -1;
  let lo = 0;
  let hi = size;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (less(mid)) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function measure(probes: Probe[], root: HTMLElement): Measured[] {
  return probes.map(probe => {
    const box = root.querySelector<HTMLElement>(`[data-probe="${CSS.escape(probe.id)}"]`);
    const wrapper = box?.querySelector<HTMLElement>(':scope > .fit-content');
    if (!box || !wrapper || wrapper.childElementCount === 0) return { ...probe, fits: false, spare: {}, error: 'nothing rendered' };
    const headroom = {
      width: probe.guards.includes('width') ? WIDGET_HEADROOM_PX : 0,
      height: probe.guards.includes('height') ? WIDGET_HEADROOM_PX : 0,
    };
    const ok = fitsWithLess(box, wrapper, headroom);
    const spare = Object.fromEntries(probe.guards.map(axis => [axis, spareOn(box, wrapper, axis, probe[axis])]));
    fitsWithLess(box, wrapper, { width: 0, height: 0 });
    return { ...probe, fits: ok, spare };
  });
}

const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

/** Resizes the probe's box, lets the kind settle, and says whether it fits with the headroom on both axes. */
async function fitsAt(box: HTMLElement, wrapper: HTMLElement, width: number, height: number): Promise<boolean> {
  box.style.width = `${width}px`;
  box.style.height = `${height}px`;
  await frame();
  return fitsWithLess(box, wrapper, { width: WIDGET_HEADROOM_PX, height: WIDGET_HEADROOM_PX });
}

/** The least size on one axis that fits, between `lo` (assumed not to) and `hi` (which does). */
async function leastOn(fitsWith: (n: number) => Promise<boolean>, lo: number, hi: number): Promise<number> {
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (await fitsWith(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

window.__least = async (probeId, start) => {
  const box = document.querySelector<HTMLElement>(`[data-probe="${CSS.escape(probeId)}"]`);
  const wrapper = box?.querySelector<HTMLElement>(':scope > .fit-content');
  if (!box || !wrapper) return null;
  let { width, height } = start;
  if (!(await fitsAt(box, wrapper, width, height))) return null;
  // Width, then height, then width again at that height: a step that
  // changes with one axis can free room on the other.
  for (let pass = 0; pass < 2; pass++) {
    width = await leastOn(w => fitsAt(box, wrapper, w, height), 0, width);
    height = await leastOn(h => fitsAt(box, wrapper, width, h), 0, height);
  }
  await fitsAt(box, wrapper, width, height);
  return { width, height };
};

function Check() {
  const entities = useEntities();
  const house = useHouse();
  const { probes: all, missing } = useMemo(() => probes(), []);
  const widgets = useMemo(() => all.map(widgetOf), [all]);
  const dashboard = useMemo(() => dashboardOf(widgets), [widgets]);
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Every entity named, present: then fonts, then a moment for @hakit's
  // own async content (a forecast, a camera's still) to arrive.
  const named = useMemo(() => {
    const ids = new Set<string>();
    for (const f of Object.values(FULLEST)) {
      for (const value of Object.values(f.settings))
        for (const id of [value].flat()) if (typeof id === 'string' && id.includes('.')) ids.add(id);
    }
    return [...ids];
  }, []);
  const loaded = named.every(id => entities.has(id));

  useEffect(() => {
    if (!loaded || ready) return;
    let live = true;
    document.fonts.ready.then(() => new Promise(r => setTimeout(r, 2500))).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, [loaded, ready]);

  useEffect(() => {
    if (!ready || !root.current) return;
    try {
      window.__fit = { measured: measure(all, root.current), missing };
    } catch (err) {
      window.__fit = { error: String(err) };
    }
  }, [ready, all, missing]);

  const face = scriptFont(language);
  const font = face ? CASA.font.sans.replace(',', `, "${face.family}",`) : CASA.font.sans;
  return (
    <>
      {face && <link rel='stylesheet' href={face.href} />}
      <style>{themeCss('casa-panel', 'dark')}</style>
      <style>{RENDERER_CSS}</style>
      <style>{WIDGETS_CSS}</style>
      <style>{FIT_CSS}</style>
      <div ref={root} className='ohm-dashboard fit-sheet' lang={language} dir={viewerDirection()} style={{ fontFamily: font }}>
        {!loaded && <p>Waiting for Home Assistant: {named.filter(id => !entities.has(id)).join(', ')}</p>}
        {loaded && (
          <DashboardConcerns dashboard={dashboard} schemaOf={kind => widgetKind(kind)?.schema}>
            {all.map((probe, i) => {
              const kind = widgetKind(probe.kind)!;
              const valid = validateWidget(widgets[i], kind.schema, { house });
              return (
                <section key={probe.id} className='fit-case'>
                  <p className='fit-label'>
                    {probe.id} · {probe.width}×{probe.height}
                  </p>
                  <div
                    className='ohm-widget'
                    data-probe={probe.id}
                    data-kind={probe.kind}
                    data-variant={probe.variant as Variant}
                    style={{ width: probe.width, height: probe.height }}
                  >
                    <div className='fit-content'>
                      {valid.ok ? <kind.Component widget={widgets[i]} settings={valid.settings} /> : <span>{valid.reason}</span>}
                    </div>
                  </div>
                </section>
              );
            })}
          </DashboardConcerns>
        )}
      </div>
    </>
  );
}

/**
 * The sheet the probes sit on, and the wrapper that gives a kind's content
 * less room than its box: it stands where the kind's root would, so the
 * box's own rules for its child (`.ohm-widget > *`, custom properties all)
 * reach the kind through it.
 */
const FIT_CSS = `
  html, body { margin: 0; background: var(--bg); }
  .fit-sheet { height: auto; container-type: normal; padding: 16px; display: flex; flex-direction: column; gap: 24px; }
  .fit-label { margin: 0 0 6px; font: 12px monospace; color: var(--ink-muted); }
  .ohm-widget { flex: none; box-sizing: border-box; outline: 1px dashed var(--line-strong); }
  .fit-content { display: flex; min-width: 0; min-height: 0; overflow: auto; flex: 1 1 auto; }
  .fit-content > * { flex: 1; min-width: 0; }
`;

/** The page's root: the dev server's connection to Home Assistant, as `App`'s, and the check in it. */
export function FitApp() {
  return (
    <HassConnect hassUrl={import.meta.env.VITE_HA_URL} hassToken={import.meta.env.VITE_HA_TOKEN}>
      <HakitTheme />
      <Check />
    </HassConnect>
  );
}
