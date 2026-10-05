/**
 * The panel on a phone (#15, ADR-0011): the same Page, Regions and
 * components as the wall's `Panel`, laid out for a hand.
 *
 * `page:main`'s Regions become tabs along the bottom -- Casa (`glance` and
 * `left`), Stanze (`right`), Altro (`footer`) -- and a Page opened from a tab
 * is pushed inside it, under a header with a back arrow; `phoneNav.ts` has
 * the rules. An opened Page shows all its Regions in one column, in the
 * protocol's order.
 *
 * Unlike the wall panel, this navigation has history: a phone has a system
 * back gesture, and without an entry to consume it would leave the app from
 * inside an Area's Page. The wall keeps ADR-0006's flat, history-less
 * navigation. There is no idle return here either: that exists for the next
 * person at the entrance, and a phone has no next person.
 *
 * This owns navigation on the phone, as `Dashboard` does on the wall, so it
 * provides the `NavigationContext` that Rows, footer blocks and the camera
 * glance open Pages through -- and wraps `children` (the Popup) in it too, so
 * a Page opened from a Popup lands in the current tab.
 */
import { useEffect, useReducer, useRef, type CSSProperties, type ReactNode } from 'react';
import { useAreas, usePage, type Placed, type Region } from '../ha';
import { Icon } from './Icon';
import { NavigationProvider } from './NavigationContext';
import { back, currentPage, initialNav, openPage, selectTab, TABS, visibleTabs, type PhoneNav, type Tab } from './phoneNav';
import { EmptyPageMessage, PlacementView } from './PlacementView';
import { popupTitle } from './popup';
import { t } from './theme';

type Action = { type: 'open'; page: string } | { type: 'back' } | { type: 'tab'; tab: Tab };

function reduce(nav: PhoneNav, action: Action): PhoneNav {
  if (action.type === 'open') return openPage(nav, action.page);
  if (action.type === 'back') return back(nav);
  return selectTab(nav, action.tab);
}

const column: CSSProperties = { display: 'flex', flexDirection: 'column', gap: t.space.sm };

/**
 * Regions in order, each as the wall renders it, stacked. The footer's blocks
 * wrap rather than run off the screen. There is no Dock (#41): the header's
 * back arrow and the tab bar are the way home here, so the footer's Page
 * Openers stay blocks among the rest, as `PlacementView` draws them where no
 * Dock takes them.
 */
function Regions({ regions, layout, glanceOn }: { regions: Region[]; layout: Record<Region, Placed[]>; glanceOn: boolean }) {
  return regions.map(region => {
    const placed = layout[region];
    if (placed.length === 0 || (region === 'glance' && !glanceOn)) return null;
    if (region === 'glance') return <PlacementView key={region} region={region} placed={placed} />;
    if (region === 'footer')
      return (
        <div key={region} style={{ display: 'flex', flexWrap: 'wrap', gap: t.space.sm, minHeight: t.layout.footerH }}>
          <PlacementView region={region} placed={placed} />
        </div>
      );
    return (
      <div key={region} style={column}>
        <PlacementView region={region} placed={placed} />
      </div>
    );
  });
}

/** An opened Page: every Region, one column. */
function OpenedPage({ page, glanceOn }: { page: string; glanceOn: boolean }) {
  const layout = usePage(page);
  if (Object.values(layout).every(placed => placed.length === 0)) return <EmptyPageMessage />;
  return <Regions regions={['glance', 'left', 'right', 'footer']} layout={layout} glanceOn={glanceOn} />;
}

function PageHeader({ page, onBack }: { page: string; onBack: () => void }) {
  const title = popupTitle(page, useAreas());
  return (
    <header
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: t.space.xs,
        paddingInline: t.space.xs,
        minHeight: t.touch.primary,
        borderBottom: `1px solid ${t.color.border}`,
      }}
    >
      <button
        type='button'
        aria-label='Indietro'
        onClick={onBack}
        style={{
          width: t.touch.primary,
          height: t.touch.primary,
          flexShrink: 0,
          padding: 0,
          border: 'none',
          background: 'none',
          color: t.color.textPrimary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <Icon name='mdi:arrow-left' size={28} />
      </button>
      <span
        style={{
          fontSize: t.font.glanceM,
          fontWeight: 600,
          color: t.color.textPrimary,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title.name}
      </span>
    </header>
  );
}

function TabBar({ tabs, nav, onTab }: { tabs: Tab[]; nav: PhoneNav; onTab: (tab: Tab) => void }) {
  return (
    <nav
      style={{
        flexShrink: 0,
        display: 'flex',
        borderTop: `1px solid ${t.color.border}`,
        background: t.color.surface,
        // Clear of a phone's home indicator, where it has one.
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.filter(x => tabs.includes(x.key)).map(x => {
        const current = x.key === nav.tab;
        return (
          <button
            key={x.key}
            type='button'
            aria-current={current ? 'page' : undefined}
            onClick={() => onTab(x.key)}
            style={{
              flex: 1,
              minHeight: t.touch.primary,
              position: 'relative',
              border: 'none',
              background: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              color: current ? t.color.activeStrong : t.color.textSecondary,
              fontSize: t.font.caption,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Icon name={x.icon} size={26} />
            {x.label}
            {/* A Page is open inside this tab, waiting where it was left. */}
            {!current && nav.stacks[x.key].length > 0 && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 'calc(50% + 12px)',
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: t.color.activeStrong,
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * The system back gesture, for the current tab's stack. While a Page is open
 * one history entry sits on top of the app's own: a back consumes it and pops
 * one level, and it is armed again while anything is still open. Going home any
 * other way (the header, a tab) takes the entry back out, so a back at the
 * root always leaves the app, as it does in any other.
 */
function useBackGesture(page: string, onBack: () => void) {
  const open = page !== 'main';
  const armed = useRef(false);
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (open && !armed.current) {
      window.history.pushState(null, '');
      armed.current = true;
    } else if (!open && armed.current) {
      armed.current = false;
      window.history.back();
    }
    // `page`, not just `open`: a back from two levels deep to one leaves
    // `open` true but has spent the entry, which must be armed again.
  }, [open, page]);

  useEffect(() => {
    const onPop = () => {
      if (!armed.current) return;
      armed.current = false;
      onBackRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}

export function PhoneShell({ glanceOn, children }: { glanceOn: boolean; children?: ReactNode }) {
  const [nav, dispatch] = useReducer(reduce, initialNav);
  const main = usePage('main');
  const tabs = visibleTabs(main, glanceOn);
  const page = currentPage(nav);
  const open = page !== 'main';

  // Back always goes through history, so the entry and the stack never disagree.
  useBackGesture(page, () => dispatch({ type: 'back' }));

  // The current tab can lose its last Placement while shown; fall to the first one left.
  const tab = tabs.includes(nav.tab) ? nav.tab : tabs[0];
  useEffect(() => {
    if (tab !== undefined && tab !== nav.tab) dispatch({ type: 'tab', tab });
  }, [tab, nav.tab]);

  const regions = TABS.find(x => x.key === nav.tab)?.regions ?? [];

  return (
    <NavigationProvider value={{ page, openPage: next => dispatch({ type: 'open', page: next }) }}>
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: t.color.ground }}>
        {open && <PageHeader page={page} onBack={() => window.history.back()} />}
        {/* Keyed by tab and Page, so each starts at its own top rather than at the last one's scroll. */}
        <main key={`${nav.tab}:${page}`} style={{ flex: 1, minHeight: 0, overflowY: 'auto', ...column, padding: t.space.md }}>
          {open ? (
            <OpenedPage page={page} glanceOn={glanceOn} />
          ) : tabs.length === 0 ? (
            <EmptyPageMessage />
          ) : (
            <Regions regions={regions} layout={main} glanceOn={glanceOn} />
          )}
        </main>
        {tabs.length > 0 && <TabBar tabs={tabs} nav={nav} onTab={tab => dispatch({ type: 'tab', tab })} />}
      </div>
      {children}
    </NavigationProvider>
  );
}
