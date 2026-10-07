/**
 * The Builder's preview (#56, ADR-0015): the real renderer drawing one Page
 * of the Draft (not what is published) at one screen size, in its frame,
 * Navbar and all, with an editing layer over the Page on which Widgets are
 * selected, moved and resized by dragging.
 *
 * ## What is the renderer's and what is the Builder's
 *
 * The screen is the renderer's own `Frame` and `Page`, given the Draft's
 * Dashboard and the Page being edited, so what the preview shows is what the
 * wall shows. Its navigation is the Dashboard screen's: the Page on screen is the one
 * picked, a Navbar item picks its Page, and a Widget's tap does nothing,
 * since every tap lands on the editing layer.
 *
 * The editing layer repeats the Page's structure (`.ohm-page > .ohm-grid`,
 * the same classes, so the same padding and the same rows) over it, and puts
 * a frame in each Widget's cells, so a frame is exactly where its Widget is
 * drawn at every size. Frames are drawn for every Widget, including one the
 * renderer skips (not yet valid), which shows why instead.
 *
 * ## Size and zoom
 *
 * The screen is laid out at the chosen size in CSS pixels, then zoomed out
 * with a transform to fit the Builder: a transform does not change layout,
 * so container queries, rows and the fit measure see the real size. The
 * pointer's pixels are turned into cells with the grid's measured, zoomed
 * geometry (`layout.ts`, `Metrics`).
 *
 * ## Fit
 *
 * After every change on screen (a Widget's state, a resize) the preview
 * measures each Widget's box by `fit.ts`'s rule and reports the ones that do
 * not fit at this size.
 */
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react';
import { validateWidget } from '../document/schema';
import type { Dashboard, Page as PageType, Size, Widget } from '../document/types';
import { useHouse } from '../ha';
import { DashboardConcerns } from '../renderer/concerns';
import { Frame, FRAME_CSS } from '../renderer/Frame';
import { cellPlacement, gridVariables, RENDERER_CSS } from '../renderer/grid';
import { initialNav, navbarItems, open } from '../renderer/navigation';
import { DashboardNavigationProvider, type DashboardNavigation } from '../renderer/navigationContext';
import { Page } from '../renderer/Page';
import { isDark, useDeviceDark } from '../theme/deviceScheme';
import { themeFor } from '../theme/themes';
import { WIDGETS_CSS, widgetKind } from '../widgets/registry';
import { fits, type Extent } from './fit';
import { canPlace, cellAt, gridOf, moved, overlaps, resized, snapDelta, type Box, type Metrics } from './layout';
import { fromId } from './dashboardStrings';
import { strings } from './strings';

const t = strings.dashboard;

/** What the Dashboard screen asks of the preview: which cell is under a point of the screen, if any. */
export type PreviewHandle = { cellAt: (clientX: number, clientY: number) => { x: number; y: number } | null };

/** A place being dragged to, shown on the grid before it is dropped. */
export type Ghost = { box: Box; valid: boolean };

type Props = {
  dashboard: Dashboard;
  page: PageType;
  screen: Size;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onPlace: (id: string, box: Box) => void;
  onDelete: (id: string) => void;
  /** A Navbar item tapped on the preview: edit its Page. */
  onOpenPage: (pageId: string) => void;
  /** The Widgets that do not fit their boxes at this size, by id. */
  onFit: (notFitting: string[]) => void;
  /** A Widget dragged in from the palette. */
  ghost: Ghost | null;
  handle: Ref<PreviewHandle>;
};

/** Pixels a pointer must travel before a press on a frame is a drag, not a tap. */
const DRAG_SLOP = 4;

export function Preview({ dashboard, page, screen, selected, onSelect, onPlace, onDelete, onOpenPage, onFit, ghost, handle }: Props) {
  const house = useHouse();
  const deviceDark = useDeviceDark();
  const stage = useRef<HTMLDivElement>(null);
  const screenEl = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const overlayPage = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(0);
  const [drag, setDrag] = useState<{ id: string; ghost: Ghost } | null>(null);

  const overflow = dashboard.settings.overflow;
  const gridCtx = gridOf(page, overflow);

  // The zoom that fits the screen into the width the Builder has for it.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setRoom(el.clientWidth));
    observer.observe(el);
    setRoom(el.clientWidth);
    return () => observer.disconnect();
  }, []);
  const scale = room > 0 ? Math.min(1, room / screen.width) : 1;

  /** The grid's geometry on screen, zoomed, as `layout.ts` takes it. */
  const metrics = useCallback((): Metrics | null => {
    const el = grid.current;
    if (!el || el.offsetWidth === 0) return null;
    const rect = el.getBoundingClientRect();
    const zoom = rect.width / el.offsetWidth;
    const style = getComputedStyle(el);
    const first = (tracks: string) => parseFloat(tracks.split(' ')[0]) || 0;
    return {
      left: rect.left,
      top: rect.top,
      column: first(style.gridTemplateColumns) * zoom,
      row: first(style.gridTemplateRows) * zoom,
      gap: (parseFloat(style.columnGap) || 0) * zoom,
    };
  }, []);

  useImperativeHandle(handle, () => ({
    cellAt: (clientX, clientY) => {
      const m = metrics();
      const el = overlayPage.current;
      if (!m || !el) return null;
      const r = el.getBoundingClientRect();
      if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
      return cellAt(m, { x: clientX, y: clientY }, gridCtx);
    },
  }));

  // A scrolling Page: the renderer's scrolls with the editing layer's.
  const syncScroll = () => {
    const shown = screenEl.current?.querySelector<HTMLElement>('.b-shown .ohm-page');
    if (shown && overlayPage.current) shown.scrollTop = overlayPage.current.scrollTop;
  };

  useFitReport(screenEl, onFit, `${screen.width}x${screen.height}`);

  /** A press on a frame: a tap selects it, a drag moves it, a drag on its corner resizes it. */
  const press = (widget: Widget, mode: 'move' | 'resize') => (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const m = metrics();
    if (!m) return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    // Pressing kept the focus where it was (no text selection mid-drag), so
    // the frame takes it here, for the keys that move it next.
    target.closest<HTMLElement>('.b-frame')?.focus({ preventScroll: true });
    const start = { x: e.clientX, y: e.clientY };
    let dragging = false;
    let last: Ghost | null = null;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!dragging && Math.hypot(dx, dy) < DRAG_SLOP) return;
      dragging = true;
      const delta = snapDelta(m, dx, dy);
      const box = mode === 'move' ? moved(widget, delta, gridCtx) : resized(widget, delta, gridCtx);
      last = { box, valid: canPlace(box, page.widgets, gridCtx, widget.id) };
      setDrag({ id: widget.id, ghost: last });
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', cancel);
      setDrag(null);
      if (!dragging) onSelect(widget.id);
      else if (last?.valid) onPlace(widget.id, last.box);
    };
    const cancel = () => {
      dragging = false;
      last = null;
      up();
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', cancel);
    onSelect(widget.id);
  };

  /** Arrows move the selected Widget a cell, Shift and arrows resize it, Delete removes it. */
  const keyFor = (widget: Widget) => (e: ReactKeyboardEvent) => {
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (e.key in step) {
      e.preventDefault();
      const [dx, dy] = step[e.key];
      const box = e.shiftKey ? resized(widget, { dx, dy }, gridCtx) : moved(widget, { dx, dy }, gridCtx);
      if (canPlace(box, page.widgets, gridCtx, widget.id)) onPlace(widget.id, box);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete(widget.id);
    } else if (e.key === 'Escape') {
      onSelect(null);
    }
  };

  // Why each Widget the renderer skips is skipped, for its frame.
  const problems = useMemo(() => {
    const out = new Map<string, string>();
    for (const w of page.widgets) {
      const kind = widgetKind(w.kind);
      const valid = validateWidget(w, kind?.schema, { grid: gridCtx, house });
      if (!valid.ok) out.set(w.id, valid.reason);
      else if (kind?.tap === 'page' && w.on_tap === null) out.set(w.id, t.widget.noPage);
    }
    return out;
  }, [page, gridCtx, house]);

  const navigation = useMemo<DashboardNavigation>(
    () => ({ page: page.id, open: () => {}, pageName: id => dashboard.pages.find(p => p.id === id && p.popup === null)?.name }),
    [page.id, dashboard.pages]
  );
  const items = navbarItems(open(initialNav(dashboard), dashboard, page.id), dashboard);

  const shownGhost = drag?.ghost ?? ghost;
  const lowest = page.widgets.reduce((n, w) => Math.max(n, w.y + w.h), 0);
  const guideRows =
    overflow === 'fit' ? page.grid.rows : Math.max(page.grid.rows, lowest + 2, (shownGhost?.box.y ?? 0) + (shownGhost?.box.h ?? 0));
  const guides = page.grid.columns * guideRows <= 2400 ? guideRows : 0;

  return (
    <div className='b-stage' ref={stage}>
      <div className='b-stage-box' style={{ width: screen.width * scale, height: screen.height * scale }}>
        <div
          className='b-screen'
          ref={screenEl}
          style={{ width: screen.width, height: screen.height, transform: `scale(${scale})`, ...themeVariables(dashboard, deviceDark) }}
          aria-label={t.preview.label(page.name)}
        >
          <style>{RENDERER_CSS}</style>
          <style>{FRAME_CSS}</style>
          <style>{WIDGETS_CSS}</style>
          <div className='ohm-dashboard'>
            <DashboardConcerns dashboard={dashboard} schemaOf={schemaOf}>
              <DashboardNavigationProvider value={navigation}>
                <Frame
                  navbar={dashboard.navbar}
                  items={items}
                  onItem={id => {
                    const item = dashboard.navbar?.items.find(i => i.id === id);
                    if (item) onOpenPage(item.page);
                  }}
                >
                  <div className='b-shown' inert>
                    <Page page={page} overflow={overflow} />
                  </div>
                  <div className='b-layer'>
                    <div
                      className='ohm-page'
                      data-overflow={overflow}
                      ref={overlayPage}
                      onScroll={syncScroll}
                      onPointerDown={() => onSelect(null)}
                    >
                      <div className='ohm-grid b-grid' ref={grid} style={gridVariables(page.grid)}>
                        {Array.from({ length: guides * page.grid.columns }, (_, i) => {
                          const cell = { x: i % page.grid.columns, y: Math.floor(i / page.grid.columns), w: 1, h: 1 };
                          // Drawn under every cell, but seen only on free ones: a line across a Widget is noise.
                          const covered = page.widgets.some(w => w.id !== drag?.id && overlaps(cell, w));
                          return <div key={`g${i}`} className='b-guide' data-covered={covered} style={cellPlacement(cell)} />;
                        })}
                        {page.widgets.map(w => (
                          <WidgetFrame
                            key={w.id}
                            widget={w}
                            selected={w.id === selected}
                            dragging={drag?.id === w.id}
                            problem={problems.get(w.id) ?? null}
                            onPress={press}
                            onKey={keyFor(w)}
                          />
                        ))}
                        {shownGhost && (
                          <div className='b-ghost' data-valid={shownGhost.valid} style={cellPlacement(shownGhost.box)}>
                            {!shownGhost.valid && <span className='b-frame-tag'>{t.preview.refused}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Frame>
              </DashboardNavigationProvider>
            </DashboardConcerns>
          </div>
        </div>
      </div>
    </div>
  );
}

const schemaOf = (kind: string) => widgetKind(kind)?.schema;

function WidgetFrame({
  widget,
  selected,
  dragging,
  problem,
  onPress,
  onKey,
}: {
  widget: Widget;
  selected: boolean;
  dragging: boolean;
  problem: string | null;
  onPress: (widget: Widget, mode: 'move' | 'resize') => (e: ReactPointerEvent) => void;
  onKey: (e: ReactKeyboardEvent) => void;
}) {
  const name = t.kinds[widget.kind] ?? fromId(widget.kind);
  return (
    <div
      className='b-frame'
      data-frame={widget.id}
      data-selected={selected}
      data-dragging={dragging}
      data-problem={problem !== null}
      style={cellPlacement(widget)}
      tabIndex={0}
      role='button'
      aria-pressed={selected}
      aria-label={widget.title ? `${name}: ${widget.title}` : name}
      onPointerDown={onPress(widget, 'move')}
      onKeyDown={onKey}
    >
      <span className='b-frame-tag'>
        {name}
        {problem !== null && ` · ${t.preview.notShown}`}
        <span className='b-frame-fit'> · {t.preview.notFitting}</span>
      </span>
      {problem !== null && <span className='b-frame-problem'>{problem}</span>}
      {selected && <span className='b-handle' aria-label={t.preview.resize} onPointerDown={onPress(widget, 'resize')} />}
    </div>
  );
}

/**
 * The Dashboard's theme, as custom properties on the preview's screen only,
 * so the Builder around it keeps its own. `auto` follows this device, and
 * switches with it while the preview is open.
 */
function themeVariables(dashboard: Dashboard, deviceDark: boolean): CSSProperties {
  const { name, mode } = dashboard.settings.theme;
  const tokens = themeFor(name)[isDark(mode, deviceDark) ? 'dark' : 'light'];
  return Object.fromEntries(Object.entries(tokens).map(([k, v]) => [`--${k}`, v])) as CSSProperties;
}

/**
 * Measures, after every change on the screen, which Widgets do not fit
 * their boxes (`fit.ts`), and reports their ids when that changes. Marks
 * each frame too, so the flag needs no render of its own.
 */
function useFitReport(screen: { current: HTMLDivElement | null }, report: (ids: string[]) => void, size: string) {
  const reported = useRef<string | null>(null);
  const latest = useRef(report);
  useEffect(() => {
    latest.current = report;
  });

  useEffect(() => {
    const root = screen.current;
    if (!root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const notFitting: string[] = [];
      for (const cell of root.querySelectorAll<HTMLElement>('.b-shown .ohm-cell[data-widget]')) {
        const box = cell.querySelector<HTMLElement>('.ohm-widget');
        if (!box) continue;
        const scrollers = [...box.querySelectorAll<HTMLElement>('*')].filter(el => {
          const s = getComputedStyle(el);
          return /auto|scroll/.test(s.overflowX) || /auto|scroll/.test(s.overflowY);
        });
        if (!fits(extent(box), scrollers.map(extent))) notFitting.push(cell.dataset.widget!);
      }
      for (const frame of root.querySelectorAll<HTMLElement>('.b-frame')) {
        frame.dataset.fits = String(!notFitting.includes(frame.dataset.frame!));
      }
      const key = notFitting.sort().join(' ');
      if (key !== reported.current) {
        reported.current = key;
        latest.current(notFitting);
      }
    };
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(measure, 120);
    };
    const mutations = new MutationObserver(soon);
    mutations.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'data-variant', 'data-selected'],
    });
    const sizes = new ResizeObserver(soon);
    sizes.observe(root);
    soon();
    return () => {
      clearTimeout(timer);
      mutations.disconnect();
      sizes.disconnect();
    };
  }, [screen, size]);
}

const extent = (el: HTMLElement): Extent => ({
  clientWidth: el.clientWidth,
  clientHeight: el.clientHeight,
  scrollWidth: el.scrollWidth,
  scrollHeight: el.scrollHeight,
});
