/**
 * PROTOTYPE (#24) -- throwaway, lives on `prototype/popup-look`, never master.
 *
 * "How does a Page look when it's shown as a Popup over the panel?"
 * Four variants of `page:citofono` shown as a Popup over the live Dashboard,
 * switched with `?variant=`:
 *
 *   A  Foglio        an inset sheet; the panel underneath is dimmed and blurred
 *   B  Pagina intera a full takeover built from the real `Panel`; close sits
 *                    in the footer where "Casa" would be
 *   C  Cassetto      a drawer over `right` + footer; the glance column stays
 *                    readable underneath
 *   D  Video         the Feed full-bleed, gates and close floating over it
 *
 * `page:citofono` does not exist in the fake house yet (#23 declares it), so
 * its Placement is stubbed here: the Ring's Feed in `right`, the two gates in
 * `left` (or `footer`, from the yellow bar). The Feed is a drawn fake, as in
 * the #25 prototype. The gates are the real `GateSlab`s on the real fake locks.
 *
 * The yellow bar also: closes/reopens the Popup, switches the Page underneath
 * between `main` and `corridoio` (the idle return changes it under a Popup),
 * and empties the Popup's Page (a Popup naming an empty Page shows the
 * empty-Page message inside the overlay). No "Casa" block in any variant:
 * the close button is the only way out (#23), so tapping the backdrop does
 * nothing either.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useByLabel } from '../ha';
import { GateSlab } from './GateSlab';
import { Icon } from './Icon';
import { Panel } from './Panel';
import { useNavigation } from './NavigationContext';
import { EmptyPageMessage } from './PlacementView';
import { PrototypeSwitcher, useUrlParam } from './PrototypeSwitcher';
import { t } from './theme';

const VARIANTS = [
  { key: 'A', name: 'Foglio' },
  { key: 'B', name: 'Pagina intera' },
  { key: 'C', name: 'Cassetto' },
  { key: 'D', name: 'Video' },
];

const TITLE = 'Citofono';

const KEYFRAMES = `
@keyframes pp-grain { 0% { transform: translate(0,0); } 25% { transform: translate(-3%,2%); } 50% { transform: translate(2%,-3%); } 75% { transform: translate(-2%,-1%); } 100% { transform: translate(0,0); } }
@keyframes pp-sway { 0%,100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
@keyframes pp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pp-rise { from { opacity: 0; transform: translateY(24px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes pp-slide { from { transform: translateX(100%); } to { transform: none; } }
@keyframes pp-blink { 0%,100% { opacity: 1; } 50% { opacity: .25; } }
`;

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return now;
}

/** A drawn doorbell view: fisheye, someone standing at the gate. */
function RingPicture() {
  const now = useClock();
  const ts = now.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'medium' });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }}>
      <svg viewBox='0 0 160 90' preserveAspectRatio='xMidYMid slice' style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <radialGradient id='pp-vignette' cx='50%' cy='50%' r='70%'>
            <stop offset='.6' stopColor='#000' stopOpacity='0' />
            <stop offset='1' stopColor='#000' stopOpacity='.7' />
          </radialGradient>
          <linearGradient id='pp-sky' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0' stopColor='#6d8190' />
            <stop offset='1' stopColor='#a9b3b6' />
          </linearGradient>
        </defs>
        <rect width='160' height='90' fill='url(#pp-sky)' />
        <path d='M0 58 Q80 50 160 58 L160 90 L0 90 Z' fill='#77716a' />
        <rect x='0' y='30' width='160' height='3' fill='#2b2b2b' />
        {Array.from({ length: 33 }, (_, i) => (
          <rect key={i} x={i * 5} y='30' width='1.4' height='26' fill='#2b2b2b' />
        ))}
        <g style={{ animation: 'pp-sway 3s ease-in-out infinite' }}>
          <ellipse cx='88' cy='88' rx='26' ry='30' fill='#2d3440' />
          <circle cx='88' cy='42' r='11' fill='#c9a58a' />
          <path d='M77 38 Q88 26 99 38 L99 34 Q88 22 77 34 Z' fill='#3a2a1e' />
        </g>
        <rect width='160' height='90' fill='url(#pp-vignette)' />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          opacity: 0.1,
          backgroundImage: 'radial-gradient(#fff 0.6px, transparent 0.8px)',
          backgroundSize: '3px 3px',
          animation: 'pp-grain 0.4s steps(4) infinite',
          pointerEvents: 'none',
        }}
      />
      <span style={{ position: 'absolute', top: 8, right: 10, fontFamily: 'monospace', fontSize: 12, color: '#fff', textShadow: '0 0 2px #000' }}>{ts}</span>
    </div>
  );
}

function LiveDot() {
  return (
    <span
      style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: t.color.fault, animation: 'pp-blink 1.6s infinite' }}
    />
  );
}

/** The Feed as #25 decided it: the picture, then a caption (name, then status). */
function Feed({ caption = true }: { caption?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: t.space.xs, flex: 1, minHeight: 0 }}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: t.radius.tile, overflow: 'hidden', border: `1px solid ${t.color.border}` }}>
        <RingPicture />
      </div>
      {caption && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: `0 ${t.space.xs}px`, fontWeight: 600 }}>
          <span style={{ fontSize: t.font.glanceM, color: t.color.textPrimary }}>Campanello</span>
          <span style={{ fontSize: t.font.body, color: t.color.textSecondary, display: 'flex', alignItems: 'center', gap: t.space.sm }}>
            <LiveDot /> In diretta
          </span>
        </div>
      )}
    </div>
  );
}

/** A GateSlab that fills its share of a row or column. */
function Gate({ entity }: { entity: Parameters<typeof GateSlab>[0]['entity'] }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <GateSlab entity={entity} />
    </div>
  );
}

/** The four Regions of the stubbed `page:citofono`, as finished nodes. */
type Regions = { glance: ReactNode[]; left: ReactNode[]; right: ReactNode[]; footer: ReactNode[]; empty: boolean };

function useCitofono(gatesAt: string, empty: boolean): Regions {
  const gates = useByLabel('gate').map(g => <Gate key={g.id} entity={g} />);
  if (empty) return { glance: [], left: [], right: [], footer: [], empty: true };
  return {
    glance: [],
    left: gatesAt === 'left' ? gates : [],
    right: [<Feed key='feed' />],
    footer: gatesAt === 'footer' ? gates : [],
    empty: false,
  };
}

/** A big round close control. 72 px: over the 64 px primary-touch floor, and read from a step back. */
function CloseButton({ onClose, size = 72, glass }: { onClose: () => void; size?: number; glass?: boolean }) {
  return (
    <button
      onClick={onClose}
      aria-label='Chiudi'
      title='Chiudi'
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 999,
        border: `1px solid ${glass ? 'rgb(255 255 255 / .35)' : t.color.border}`,
        background: glass ? 'rgb(0 0 0 / .45)' : t.color.surfaceRaised,
        backdropFilter: glass ? 'blur(6px)' : undefined,
        color: t.color.textPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <Icon name='mdi:close' size={Math.round(size * 0.5)} />
    </button>
  );
}

function Title({ size = t.font.glanceL }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: t.space.md, color: t.color.textPrimary }}>
      <Icon name='mdi:doorbell-video' size={Math.round(size * 1.1)} />
      <span style={{ fontSize: size, fontWeight: 700 }}>{TITLE}</span>
    </div>
  );
}

// ---------------------------------------------------------------- A: Foglio
/**
 * An inset sheet. The panel underneath is still there, dimmed and blurred, so
 * the Popup reads as "on top of" rather than "instead of". The Regions keep
 * the panel's own two-column shape at a smaller scale; `glance` has no
 * quadrant because nothing is Placed there, so `left` stands alone.
 */
function VariantA({ r, onClose }: { r: Regions; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: t.color.backdrop,
        backdropFilter: 'blur(4px)',
        animation: 'pp-fade .2s ease-out',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: t.space.lg,
          padding: t.space.lg,
          background: t.color.ground,
          border: `1px solid ${t.color.border}`,
          borderRadius: t.radius.tile * 2,
          boxShadow: '0 24px 80px rgb(0 0 0 / .7)',
          animation: 'pp-rise .25s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title />
          <CloseButton onClose={onClose} />
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: t.space.lg }}>
          {r.empty ? (
            <EmptyPageMessage />
          ) : (
            <>
              {(r.glance.length > 0 || r.left.length > 0) && (
                <div style={{ flex: `0 0 ${t.layout.leftColW}px`, display: 'grid', alignContent: 'end', gap: t.space.sm }}>
                  {r.glance}
                  {r.left}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: t.space.sm }}>{r.right}</div>
            </>
          )}
        </div>
        {r.footer.length > 0 && <div style={{ display: 'flex', gap: t.space.sm }}>{r.footer}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- B: Pagina intera
/**
 * A full takeover, laid out by the real `Panel` -- a Popup is "just a Page",
 * shown opaque over the one underneath (still mounted, not visible).
 *
 * Two renderer-supplied blocks, the same kind of exception as `HomeBlock`:
 * - `glance` gets a Popup identity block (title, "suonato alle"), because the
 *   real `Panel` drops the whole left column -- `left` with it -- when there
 *   is no `glance`. Without it the gates in `left` would vanish.
 * - the footer's first block is "Chiudi", exactly where "Casa" sits on every
 *   other non-main Page: the hand already knows where the way out is.
 * A thin accent rule across the top says "this is not an ordinary Page".
 */
function VariantB({ r, onClose }: { r: Regions; onClose: () => void }) {
  const now = useClock();
  const [rangAt] = useState(() => new Date());
  const ago = Math.max(0, Math.round((now.getTime() - rangAt.getTime()) / 1000));
  const identity = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: t.space.sm,
        padding: t.space.lg,
        borderRadius: t.radius.tile,
        background: t.color.surface,
        border: `1px solid ${t.color.border}`,
      }}
    >
      <Title size={t.font.glanceXL * 0.75} />
      <span style={{ fontSize: t.font.body, color: t.color.textSecondary }}>
        Hanno suonato {ago < 60 ? `${ago} s fa` : `${Math.round(ago / 60)} min fa`}
      </span>
    </div>
  );
  const close = (
    <div key='close' style={{ display: 'flex', flex: '0 0 auto' }}>
      <button
        onClick={onClose}
        style={{
          minWidth: 120,
          minHeight: t.layout.footerH,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.space.xs,
          borderRadius: t.radius.tile,
          border: `1px solid ${t.color.border}`,
          background: t.color.surfaceRaised,
          color: t.color.textPrimary,
          cursor: 'pointer',
          padding: `${t.space.sm}px ${t.space.lg}px`,
        }}
      >
        <Icon name='mdi:close' size={26} />
        <span style={{ fontSize: t.font.caption, fontWeight: 600 }}>Chiudi</span>
      </button>
    </div>
  );
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: t.color.ground, animation: 'pp-fade .15s ease-out' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: t.color.activeStrong, zIndex: 1 }} />
      <Panel
        glance={identity}
        left={<>{r.left}</>}
        right={r.empty ? <EmptyPageMessage /> : <>{r.right}</>}
        footer={
          <>
            {close}
            {r.footer}
          </>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------- C: Cassetto
/**
 * A drawer over `right` and the footer. The glance column underneath stays
 * visible under a light scrim, so the house's Verdict is still readable while
 * someone is at the gate. Inside, the Regions re-flow into one column: Feed on
 * top, gates beneath it in a row -- a drawer has no room for a `left` column.
 * The close control is the drawer's whole left edge: a tall strip the hand
 * cannot miss, pointing the way the drawer leaves.
 */
function VariantC({ r, onClose }: { r: Regions; onClose: () => void }) {
  const drawerLeft = t.layout.leftColW + t.space.lg * 1.5;
  const below = [...r.left, ...r.footer];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgb(0 0 0 / .45)', animation: 'pp-fade .2s ease-out' }} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          left: drawerLeft,
          display: 'flex',
          background: t.color.ground,
          borderLeft: `1px solid ${t.color.border}`,
          boxShadow: '-24px 0 60px rgb(0 0 0 / .6)',
          animation: 'pp-slide .25s ease-out',
        }}
      >
        <button
          onClick={onClose}
          aria-label='Chiudi'
          style={{
            flex: '0 0 76px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.space.sm,
            background: t.color.surface,
            border: 'none',
            borderRight: `1px solid ${t.color.border}`,
            color: t.color.textPrimary,
            cursor: 'pointer',
          }}
        >
          <Icon name='mdi:chevron-double-right' size={40} />
          <span style={{ writingMode: 'vertical-rl', fontSize: t.font.body, fontWeight: 700, letterSpacing: 2 }}>CHIUDI</span>
        </button>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: t.space.md, padding: t.space.lg }}>
          <Title size={t.font.glanceM} />
          {r.empty ? (
            <EmptyPageMessage />
          ) : (
            <>
              {r.glance}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{r.right}</div>
              {below.length > 0 && <div style={{ display: 'flex', gap: t.space.sm }}>{below}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- D: Video
/**
 * The Feed is the Popup. It fills the screen edge to edge; everything else --
 * title, close, gates -- floats over it on dark gradients. The Regions stop
 * being a layout: `right` becomes the background, everything in `left` and
 * `footer` becomes one floating row along the bottom. Nothing to dim: the
 * panel underneath is simply covered.
 */
function VariantD({ r, onClose }: { r: Regions; onClose: () => void }) {
  const floating = [...r.left, ...r.footer];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: t.color.ground, animation: 'pp-fade .2s ease-out' }}>
      {r.empty ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          <EmptyPageMessage />
        </div>
      ) : (
        <RingPicture />
      )}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: t.space.lg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to bottom, rgb(0 0 0 / .65), transparent)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: t.space.lg }}>
          <Title />
          {!r.empty && (
            <span style={{ display: 'flex', alignItems: 'center', gap: t.space.sm, fontSize: t.font.body, fontWeight: 600, color: t.color.textPrimary }}>
              <LiveDot /> In diretta
            </span>
          )}
        </div>
        <CloseButton onClose={onClose} size={80} glass />
      </div>
      {floating.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: `${t.space.xl * 2}px ${t.space.lg}px ${t.space.lg}px`,
            display: 'flex',
            gap: t.space.lg,
            justifyContent: 'center',
            background: 'linear-gradient(to top, rgb(0 0 0 / .7), transparent)',
          }}
        >
          {floating.map((g, i) => (
            <div key={i} style={{ flex: '0 0 380px', display: 'flex' }}>
              {g}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the prototype
const barBtn: React.CSSProperties = {
  background: '#111',
  color: '#ffe14d',
  border: 'none',
  borderRadius: 999,
  padding: '4px 10px',
  font: '600 12px system-ui, sans-serif',
  cursor: 'pointer',
};

export function PopupPrototype() {
  const [variant, setVariant] = useUrlParam('variant', 'A');
  const [open, setOpen] = useUrlParam('popup', 'citofono');
  const [gatesAt, setGatesAt] = useUrlParam('gates', 'left');
  const [emptyParam, setEmpty] = useUrlParam('empty', '0');
  const empty = emptyParam === '1';
  const { page, openPage } = useNavigation();
  const r = useCitofono(gatesAt, empty);
  const isOpen = open !== '';
  const close = () => setOpen('');

  return (
    <>
      <style>{KEYFRAMES}</style>
      {isOpen && variant === 'A' && <VariantA r={r} onClose={close} />}
      {isOpen && variant === 'B' && <VariantB r={r} onClose={close} />}
      {isOpen && variant === 'C' && <VariantC r={r} onClose={close} />}
      {isOpen && variant === 'D' && <VariantD r={r} onClose={close} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} onChange={setVariant}>
        <button style={barBtn} onClick={() => setOpen(isOpen ? '' : 'citofono')}>
          {isOpen ? 'popup: citofono' : 'popup: — (riapri)'}
        </button>
        <button style={barBtn} onClick={() => openPage(page === 'main' ? 'corridoio' : 'main')}>
          sotto: {page}
        </button>
        <button style={barBtn} onClick={() => setGatesAt(gatesAt === 'left' ? 'footer' : 'left')}>
          cancelli: {gatesAt}
        </button>
        <button style={barBtn} onClick={() => setEmpty(empty ? '0' : '1')}>
          pagina vuota: {empty ? 'sì' : 'no'}
        </button>
      </PrototypeSwitcher>
    </>
  );
}
