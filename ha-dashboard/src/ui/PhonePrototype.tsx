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
 *   C  Schede    Regions become destinations: a bottom tab bar with
 *                Casa (glance + left), Stanze (right), Altro (footer)
 *   D  Onesto    a wall-first panel admitting it: glance and the gates only;
 *                right and footer do not render on a phone
 *
 * The third option in the ticket -- a phone as its own labelled Page -- is
 * not a layout, so it has no variant: any of A-D could render `page:phone`.
 */
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Panel } from './Panel';
import { PHONE, WALL_FONT } from './phoneProto';
import { PrototypeSwitcher } from './PrototypeSwitcher';
import { t } from './theme';

const VARIANTS = [
  { key: 'W', name: 'Parete' },
  { key: 'A', name: 'Pila' },
  { key: 'B', name: 'Pollice' },
  { key: 'C', name: 'Schede' },
  { key: 'D', name: 'Onesto' },
];

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

function Schede({ glance, left, right, footer }: Regions) {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('casa');
  return (
    <div style={{ ...page, height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', ...column, padding: 16 }}>
        {tab === 'casa' && (
          <>
            {glance && (
              <>
                <RegionTag name='glance' />
                {glance}
              </>
            )}
            <RegionTag name='left' />
            <div style={column}>{left}</div>
          </>
        )}
        {tab === 'stanze' && (
          <>
            <RegionTag name='right' />
            <div style={column}>{right}</div>
          </>
        )}
        {tab === 'altro' && (
          <>
            <RegionTag name='footer' />
            <FooterWrap>{footer}</FooterWrap>
          </>
        )}
      </div>
      <nav
        style={{
          flexShrink: 0,
          display: 'flex',
          borderTop: `1px solid ${t.color.border}`,
          background: t.color.surface,
          paddingBottom: 48,
        }}
      >
        {TABS.map(x => (
          <button
            key={x.key}
            type='button'
            onClick={() => setTab(x.key)}
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
            }}
          >
            <Icon name={x.icon} size={26} />
            {x.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

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

export function PhoneLayout(regions: Regions) {
  const v = PHONE.variant;
  const body =
    v === 'A' ? (
      <Pila {...regions} />
    ) : v === 'B' ? (
      <Pollice {...regions} />
    ) : v === 'C' ? (
      <Schede {...regions} />
    ) : v === 'D' ? (
      <Onesto {...regions} />
    ) : (
      <Panel {...regions} />
    );

  const arm = PHONE.type === 'arm';
  return (
    <>
      {body}
      <PrototypeSwitcher variants={VARIANTS} current={v} onChange={key => go({ variant: key })}>
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
    </>
  );
}
