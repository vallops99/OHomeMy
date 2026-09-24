/**
 * PROTOTYPE (#15) -- throwaway, lives on `prototype/phone-layout`, never master.
 *
 * "What do the four Regions do on a phone?" Same Page, same components, same
 * Placement; only the shell around the Regions changes. Switched with
 * `?variant=` on the real Dashboard, type scale with `?type=wall|arm`:
 *
 *   W  Parete    the wall `Panel`, untouched -- what a phone gets today
 *   A  Pila      one scrolling column in a fixed Region order:
 *                glance, left, right, footer
 *   B  Pollice   ordered by reach: glance and right scroll away at the
 *                top, the gates and footer pinned under the thumb; rows drop
 *                their slider (the Area's Page has it)
 *   C  Schede    Regions of page:main become tabs -- Casa (glance + left),
 *                Stanze (right), Altro (footer) -- and an opened Page is
 *                pushed inside the tab it was opened from, one stack per tab
 *   E  Schede    the same tabs, but an opened Page covers them all, and any
 *                tab closes it
 *   D  Onesto    a wall-first panel admitting it: glance and the gates only;
 *                right and footer do not render on a phone
 *
 * The third option in the ticket -- a phone as its own labelled Page -- is
 * not a layout, so it has no variant: any of A-D could render `page:phone`.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useAreas, usePage } from '../ha';
import { Icon } from './Icon';
import { NavigationProvider } from './NavigationContext';
import { EmptyPageMessage, PlacementView } from './PlacementView';
import { Panel } from './Panel';
import { PHONE, WALL_FONT } from './phoneProto';
import { PrototypeSwitcher } from './PrototypeSwitcher';
import { t } from './theme';

const VARIANTS = [
  { key: 'W', name: 'Parete' },
  { key: 'A', name: 'Pila' },
  { key: 'B', name: 'Pollice' },
  { key: 'C', name: 'Schede, pila' },
  { key: 'E', name: 'Schede, sopra' },
  { key: 'D', name: 'Onesto' },
];

/** Variants that own navigation themselves (the Dashboard hands them only the glance toggle). */
export const OWNS_NAVIGATION = PHONE.variant === 'C' || PHONE.variant === 'E';

type Regions = { glance?: ReactNode; left: ReactNode; right: ReactNode; footer: ReactNode };

/** Tokens are retuned at module load, so a switch is a reload, not a re-render. */
function go(changes: Record<string, string>) {
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(changes)) params.set(k, v);
  window.location.search = params.toString();
}

const page: CSSProperties = {
  background: t.color.ground,
  color: t.color.textPrimary,
  minHeight: '100dvh',
  boxSizing: 'border-box',
};

const column: CSSProperties = { display: 'flex', flexDirection: 'column', gap: t.space.sm };

/** A small caption over a Region, so the prototype shows where each one landed. */
function RegionTag({ name }: { name: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: '#ffe14d',
        opacity: 0.6,
        marginTop: t.space.sm,
        fontFamily: 'monospace',
      }}
    >
      {name}
    </div>
  );
}

/** The footer's blocks, wrapping instead of running off a narrow screen. */
function FooterWrap({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: t.space.sm,
        minHeight: t.layout.footerH,
        ...(scroll ? { overflowX: 'auto', flexWrap: 'nowrap' } : { flexWrap: 'wrap' }),
      }}
    >
      {children}
    </div>
  );
}

function Pila({ glance, left, right, footer }: Regions) {
  return (
    <div style={{ ...page, ...column, padding: 16, paddingBottom: 72 }}>
      {glance && (
        <>
          <RegionTag name='glance' />
          {glance}
        </>
      )}
      <RegionTag name='left' />
      <div style={column}>{left}</div>
      <RegionTag name='right' />
      <div style={column}>{right}</div>
      <RegionTag name='footer' />
      <FooterWrap>{footer}</FooterWrap>
    </div>
  );
}

function Pollice({ glance, left, right, footer }: Regions) {
  return (
    <div style={{ ...page, height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', ...column, padding: 16 }}>
        {glance && (
          <>
            <RegionTag name='glance' />
            {glance}
          </>
        )}
        <RegionTag name='right' />
        <div style={column}>{right}</div>
      </div>
      <div
        style={{
          flexShrink: 0,
          ...column,
          padding: 16,
          paddingTop: t.space.sm,
          paddingBottom: 56,
          borderTop: `1px solid ${t.color.border}`,
          background: t.color.ground,
        }}
      >
        <RegionTag name='left' />
        <div style={column}>{left}</div>
        <RegionTag name='footer' />
        <FooterWrap scroll>{footer}</FooterWrap>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'casa', label: 'Casa', icon: 'mdi:home' },
  { key: 'stanze', label: 'Stanze', icon: 'mdi:sofa' },
  { key: 'altro', label: 'Altro', icon: 'mdi:dots-grid' },
] as const;

function Onesto({ glance, left }: Regions) {
  return (
    <div style={{ ...page, ...column, padding: 16, paddingBottom: 72 }}>
      {glance && (
        <>
          <RegionTag name='glance' />
          {glance}
        </>
      )}
      <RegionTag name='left' />
      <div style={column}>{left}</div>
      <div
        style={{
          marginTop: t.space.lg,
          padding: t.space.md,
          borderRadius: t.radius.tile,
          border: `1px dashed ${t.color.border}`,
          color: t.color.textSecondary,
          fontSize: t.font.body,
          display: 'flex',
          gap: t.space.sm,
          alignItems: 'center',
        }}
      >
        <Icon name='mdi:tablet' size={24} />
        Stanze e pagine sono sul pannello all&apos;ingresso.
      </div>
    </div>
  );
}

function Switcher() {
  const arm = PHONE.type === 'arm';
  return (
    <PrototypeSwitcher variants={VARIANTS} current={PHONE.variant} onChange={key => go({ variant: key })}>
      <button
        type='button'
        onClick={() => go({ type: arm ? 'wall' : 'arm' })}
        title={`hero ${WALL_FONT.hero}->${t.font.hero}, body ${WALL_FONT.body}->${t.font.body}`}
        style={{
          border: '1px solid #111',
          borderRadius: 999,
          background: arm ? '#111' : 'transparent',
          color: arm ? '#ffe14d' : '#111',
          font: '600 12px system-ui, sans-serif',
          padding: '3px 8px',
          cursor: 'pointer',
        }}
      >
        {arm ? 'testo: braccio' : 'testo: parete'}
      </button>
    </PrototypeSwitcher>
  );
}

export function PhoneLayout(regions: Regions) {
  const v = PHONE.variant;
  const body =
    v === 'A' ? <Pila {...regions} /> : v === 'B' ? <Pollice {...regions} /> : v === 'D' ? <Onesto {...regions} /> : <Panel {...regions} />;

  return (
    <>
      {body}
      <Switcher />
    </>
  );
}

/* ------------------------------------------------------------------------
 * Navigation for the tab variants (C, E). Round two of #15: the first C
 * showed the *current* Page's Regions under the tabs, so opening an Area
 * turned every tab into that Area's, and "Casa" meant a Region, not home.
 *
 * Here the tabs always belong to `page:main`; an opened Page is pushed
 * *over* a tab's content with a header and a back arrow. The system back
 * gesture pops one level (a phone has one; the wall panel does not, which
 * is why #14 had no history).
 * ---------------------------------------------------------------------- */

type TabKey = (typeof TABS)[number]['key'];

function useRegions(name: string, glanceOn: boolean) {
  const layout = usePage(name);
  const isEmpty = Object.values(layout).every(placed => placed.length === 0);
  return {
    isEmpty,
    glance: glanceOn && layout.glance.length > 0 ? <PlacementView region='glance' placed={layout.glance} /> : undefined,
    left: layout.left.length > 0 ? <PlacementView region='left' placed={layout.left} /> : undefined,
    right: layout.right.length > 0 ? <PlacementView region='right' placed={layout.right} /> : undefined,
    // No "Casa" block: the header's back arrow and the tab bar replace it.
    footer: layout.footer.length > 0 ? <PlacementView region='footer' placed={layout.footer} home={false} /> : undefined,
  };
}

/** An opened Page, all its Regions in one column (variant A's order). */
function StackedPage({ name, glanceOn }: { name: string; glanceOn: boolean }) {
  const r = useRegions(name, glanceOn);
  if (r.isEmpty) return <EmptyPageMessage />;
  return (
    <>
      {r.glance && (
        <>
          <RegionTag name='glance' />
          {r.glance}
        </>
      )}
      {r.left && (
        <>
          <RegionTag name='left' />
          <div style={column}>{r.left}</div>
        </>
      )}
      {r.right && (
        <>
          <RegionTag name='right' />
          <div style={column}>{r.right}</div>
        </>
      )}
      {r.footer && (
        <>
          <RegionTag name='footer' />
          <FooterWrap>{r.footer}</FooterWrap>
        </>
      )}
    </>
  );
}

/** One of main's tabs: the Regions that tab stands for. */
function MainTab({ tab, glanceOn }: { tab: TabKey; glanceOn: boolean }) {
  const r = useRegions('main', glanceOn);
  if (tab === 'casa')
    return (
      <>
        {r.glance && (
          <>
            <RegionTag name='glance' />
            {r.glance}
          </>
        )}
        <RegionTag name='left' />
        <div style={column}>{r.left}</div>
      </>
    );
  if (tab === 'stanze')
    return (
      <>
        <RegionTag name='right' />
        <div style={column}>{r.right}</div>
      </>
    );
  return (
    <>
      <RegionTag name='footer' />
      <FooterWrap>{r.footer}</FooterWrap>
    </>
  );
}

function usePageTitle(name: string) {
  const area = useAreas().find(a => a.id === name);
  return area?.name ?? name.charAt(0).toUpperCase() + name.slice(1);
}

function PageHeader({ name, onBack }: { name: string; onBack: () => void }) {
  const title = usePageTitle(name);
  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: t.space.xs,
        paddingInline: t.space.xs,
        minHeight: t.touch.primary,
        borderBottom: `1px solid ${t.color.border}`,
        background: t.color.ground,
      }}
    >
      <button
        type='button'
        aria-label='Indietro'
        onClick={onBack}
        style={{
          width: t.touch.primary,
          height: t.touch.primary,
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
      <span style={{ fontSize: t.font.glanceM, fontWeight: 600 }}>{title}</span>
    </div>
  );
}

function TabBar({ tab, depth, onTab }: { tab: TabKey; depth: (k: TabKey) => number; onTab: (k: TabKey) => void }) {
  return (
    <nav
      style={{ flexShrink: 0, display: 'flex', borderTop: `1px solid ${t.color.border}`, background: t.color.surface, paddingBottom: 48 }}
    >
      {TABS.map(x => (
        <button
          key={x.key}
          type='button'
          onClick={() => onTab(x.key)}
          style={{
            flex: 1,
            minHeight: t.touch.primary,
            border: 'none',
            background: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            color: tab === x.key ? t.color.activeStrong : t.color.textSecondary,
            fontSize: t.font.caption,
            fontWeight: 600,
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <Icon name={x.icon} size={26} />
          {x.label}
          {/* A dot on a tab with a Page open inside it (C only). */}
          {depth(x.key) > 0 && tab !== x.key && (
            <span
              style={{
                position: 'absolute',
                top: 10,
                right: '32%',
                width: 8,
                height: 8,
                borderRadius: 4,
                background: t.color.activeStrong,
              }}
            />
          )}
        </button>
      ))}
    </nav>
  );
}

/**
 * The phone's back gesture. While anything is open, exactly one extra
 * history entry sits on top; a back pops one level and, if something is
 * still open, re-arms the entry. Nothing else in the history is touched.
 */
function useBackGesture(open: boolean, pop: () => void) {
  const armed = useRef(false);
  const popRef = useRef(pop);
  popRef.current = pop;

  useEffect(() => {
    if (open && !armed.current) {
      window.history.pushState({ phoneProto: true }, '');
      armed.current = true;
    }
    if (!open && armed.current) {
      armed.current = false;
      window.history.back();
    }
  }, [open]);

  useEffect(() => {
    const onPop = () => {
      if (!armed.current) return;
      armed.current = false;
      popRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
}

export function PhoneNav({ glanceOn }: { glanceOn: boolean }) {
  const perTab = PHONE.variant === 'C';
  const [tab, setTab] = useState<TabKey>('casa');
  // C: a stack per tab. E: one stack, kept under 'casa' and shown over whatever tab is active.
  const [stacks, setStacks] = useState<Record<TabKey, string[]>>({ casa: [], stanze: [], altro: [] });
  const key: TabKey = perTab ? tab : 'casa';
  const stack = stacks[key];
  const top = stack.at(-1);

  const push = useCallback(
    (p: string) =>
      setStacks(s => ({
        ...s,
        // `main` from inside a stack is "home": clear it.
        [key]: p === 'main' ? [] : s[key].at(-1) === p ? s[key] : [...s[key], p],
      })),
    [key]
  );
  const pop = useCallback(() => setStacks(s => ({ ...s, [key]: s[key].slice(0, -1) })), [key]);
  const clear = (k: TabKey) => setStacks(s => ({ ...s, [k]: [] }));

  useBackGesture(stack.length > 0, pop);

  const onTab = (k: TabKey) => {
    if (perTab) {
      // Standard tab-bar rule: tapping the tab you're on goes to its root.
      if (k === tab) clear(k);
      setTab(k);
    } else {
      // E: any tab closes the open Page.
      clear('casa');
      setTab(k);
    }
  };

  return (
    <NavigationProvider value={{ page: top ?? 'main', openPage: push }}>
      <div style={{ ...page, height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {top && <PageHeader name={top} onBack={() => window.history.back()} />}
        <div key={`${key}:${top ?? ''}:${tab}`} style={{ flex: 1, minHeight: 0, overflowY: 'auto', ...column, padding: 16 }}>
          {top ? <StackedPage name={top} glanceOn={glanceOn} /> : <MainTab tab={tab} glanceOn={glanceOn} />}
        </div>
        <TabBar tab={tab} depth={k => (perTab ? stacks[k].length : 0)} onTab={onTab} />
      </div>
      <Switcher />
    </NavigationProvider>
  );
}
