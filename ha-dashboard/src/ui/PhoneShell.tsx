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
import { Clock } from './Clock';
import { NavDockBar, NavDockItem } from './Dock';
import { Icon } from './Icon';
import { NavigationProvider } from './NavigationContext';
import { back, currentPage, initialNav, openPage, selectTab, tabBarItems, TABS, visibleTabs, type PhoneNav, type Tab } from './phoneNav';
import { EmptyPageMessage, PlacementView } from './PlacementView';
import { popupTitle } from './popup';
import { t } from './theme';

type Action = { type: 'open'; page: string } | { type: 'back' } | { type: 'tab'; tab: Tab };

function reduce(nav: PhoneNav, action: Action): PhoneNav {
  if (action.type === 'open') return openPage(nav, action.page);
  if (action.type === 'back') return back(nav);
  return selectTab(nav, action.tab);
}

/**
 * The phone's gutter, Casa Panel's `space-4`: the wall's 28 px sides would
 * leave a 390 px phone two Room Tiles of ~150 px.
 */
const GUTTER = t.space[4];

/** Casa Panel's spacing, on a phone too: 12 px between siblings, 20 px between Regions. */
const siblings: CSSProperties = { display: 'flex', flexDirection: 'column', gap: t.space[3] };

/**
 * Regions in order, each as the wall renders it, stacked. The footer's blocks
 * wrap rather than run off the screen. There is no Dock (#41): the header's
 * back arrow and the tab bar are the way home here, so the footer's Page
 * Openers stay blocks among the rest, as `PlacementView` draws them where no
 * Dock takes them.
 *
 * `glance` comes in the wall's reading order (#45): the chips first, as the
 * wall's status bar has them across the top, then the Hero and the
 * StatCards. The chips are the Verdict's exceptions, and on a phone they
 * would otherwise sit under a screenful of temperature.
 */
function Regions({ regions, layout, glanceOn }: { regions: Region[]; layout: Record<Region, Placed[]>; glanceOn: boolean }) {
  return regions.map(region => {
    const placed = layout[region];
    if (placed.length === 0 || (region === 'glance' && !glanceOn)) return null;
    if (region === 'glance')
      return (
        <div key={region} style={{ ...siblings, gap: t.space[5] }}>
          <PlacementView region={region} placed={placed} part='chips' />
          <PlacementView region={region} placed={placed} part='column' />
        </div>
      );
    if (region === 'footer')
      return (
        <div key={region} style={{ display: 'flex', flexWrap: 'wrap', gap: t.space[3], minHeight: t.layout.footerH }}>
          <PlacementView region={region} placed={placed} />
        </div>
      );
    return (
      <div key={region} style={siblings}>
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

/**
 * A pushed Page's header (#45): the back arrow, then the Page's name where
 * the wall's Clock would be, in the Clock's type. The arrow is Casa Panel's
 * outline button made round -- a `target-min` circle -- since it carries an
 * icon and no word.
 */
function PageHeader({ page, onBack }: { page: string; onBack: () => void }) {
  const title = popupTitle(page, useAreas());
  const type = t.type.clock;
  return (
    <header
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: t.space[3],
        boxSizing: 'border-box',
        minHeight: t.size.statusBarHeight,
        padding: `${t.space[3]}px ${GUTTER}px 0`,
      }}
    >
      <button
        type='button'
        className='casa-press'
        aria-label='Indietro'
        onClick={onBack}
        style={{
          width: t.size.targetMin,
          height: t.size.targetMin,
          flexShrink: 0,
          padding: 0,
          boxSizing: 'border-box',
          borderRadius: t.radius.pill,
          border: `1px solid ${t.color.lineStrong}`,
          background: 'transparent',
          color: t.color.inkSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'manipulation',
        }}
      >
        <Icon name='mdi:arrow-left' size={22} />
      </button>
      <h1
        style={{
          margin: 0,
          minWidth: 0,
          fontSize: type.size,
          lineHeight: type.lineHeight,
          fontWeight: type.weight,
          letterSpacing: type.letterSpacing,
          color: t.color.ink,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title.name}
      </h1>
    </header>
  );
}

/**
 * The tabs, drawn as the wall's Dock (#45): Casa Panel's NavDock, each tab its
 * icon over its name, the current one a `primary` pill. It floats inside the
 * gutter like the Dock in the wall's floor, clear of a phone's home
 * indicator where it has one.
 */
function TabBar({ tabs, nav, onTab }: { tabs: Tab[]; nav: PhoneNav; onTab: (tab: Tab) => void }) {
  return (
    <NavDockBar label='Schede' style={{ flexShrink: 0, margin: `0 ${GUTTER}px calc(${t.space[3]}px + env(safe-area-inset-bottom))` }}>
      {tabBarItems(nav, tabs).map(x => (
        <NavDockItem
          key={x.key}
          icon={x.icon}
          name={x.label}
          current={x.current}
          onPress={() => onTab(x.key)}
          badge={
            // A Page is open inside this tab, waiting where it was left. In
            // `ink`, not `accent`: an open Page is not something being on.
            x.pageOpen && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 'calc(50% + 14px)',
                  width: 8,
                  height: 8,
                  borderRadius: t.radius.pill,
                  background: t.color.ink,
                }}
              />
            )
          }
        />
      ))}
    </NavDockBar>
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
        <main
          key={`${nav.tab}:${page}`}
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', ...siblings, gap: t.space[5], padding: `${t.space[4]}px ${GUTTER}px` }}
        >
          {open ? (
            <OpenedPage page={page} glanceOn={glanceOn} />
          ) : tabs.length === 0 ? (
            <EmptyPageMessage />
          ) : (
            <>
              {/*
                The Clock tops Casa's root (#45), as it tops every Page on the
                wall. Only there: a pushed Page's header has its name in the
                Clock's place, and Stanze and Altro are lists to reach into,
                not the house's state at a glance.
              */}
              {nav.tab === 'casa' && <Clock />}
              <Regions regions={regions} layout={main} glanceOn={glanceOn} />
            </>
          )}
        </main>
        {tabs.length > 0 && <TabBar tabs={tabs} nav={nav} onTab={tab => dispatch({ type: 'tab', tab })} />}
      </div>
      {children}
    </NavigationProvider>
  );
}
