/**
 * PROTOTYPE -- throwaway (#25, "Camera Page and the Feed tile").
 *
 * Three variants of the Feed and of a Page of Feeds, switchable via
 * `?variant=A|B|C`, on the real Dashboard (sub-shape A of the `prototype`
 * skill). A prototype-only Page, `telecamere`, puts every camera in `right`
 * (nothing in `glance`, so `right` has the panel's full width), and the
 * camera glance on `page:main` opens it. `?left=feed` swaps the glance in
 * `left` for a single Feed, to see a Feed in the narrow column.
 *
 * The fakes are still images, and the WebRTC Feed doesn't exist yet
 * (docs/research/camera-streaming.md), so the "live picture" is a drawn scene
 * with a running timestamp and a figure that walks through on motion. The
 * yellow bar sets each camera's state by hand: live, stuck loading, stream
 * failed, Unavailable, and motion.
 *
 * Tap behaviour differs per variant, on purpose:
 *   A  Griglia       tap a Feed -> full-screen over the whole panel
 *   B  Principale    tap a thumbnail -> it becomes the big one; tap the big one -> nothing
 *   C  Righe         tap a row -> it expands in place (one at a time)
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useEntities, type Entity, type PageLayout } from '../ha';
import { Icon } from './Icon';
import { useNavigation } from './NavigationContext';
import { PrototypeSwitcher, useUrlParam } from './PrototypeSwitcher';
import { t } from './theme';

export const PROTO_PAGE = 'telecamere';

type Sim = 'live' | 'loading' | 'failed' | 'unavailable';
const SIMS: Sim[] = ['live', 'loading', 'failed', 'unavailable'];
const SIM_LABEL: Record<Sim, string> = { live: 'live', loading: 'carica', failed: 'errore', unavailable: 'N/D' };

const VARIANTS = [
  { key: 'A', name: 'Griglia · tap = schermo intero' },
  { key: 'B', name: 'Principale + striscia' },
  { key: 'C', name: 'Righe che si espandono' },
];

type Proto = {
  variant: string;
  leftFeed: boolean;
  sims: Record<string, Sim>;
  motion: Record<string, boolean>;
  /** The camera B shows big / C shows expanded. */
  focus: string | null;
  setFocus: (id: string | null) => void;
  /** A's full-screen Feed. */
  fullscreen: string | null;
  setFullscreen: (id: string | null) => void;
  retry: (id: string) => void;
};

const Ctx = createContext<Proto | null>(null);
const useProto = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('FeedPrototype outside provider');
  return c;
};

/** The cameras, in registry order. */
function useCameras(): Entity[] {
  const entities = useEntities();
  return [...entities.values()].filter(e => e.domain === 'camera');
}

/** The prototype Page `telecamere`: every camera in `right`, nothing else Placed. */
export function useProtoPage(name: string, page: PageLayout): PageLayout {
  const cameras = useCameras();
  if (name !== PROTO_PAGE) return page;
  return { glance: [], left: [], right: cameras.map(entity => ({ kind: 'entity' as const, entity })), footer: page.footer };
}

export function FeedPrototypeProvider({ children }: { children: ReactNode }) {
  const [variant, setVariant] = useUrlParam('variant', 'A');
  const [left, setLeft] = useUrlParam('left', 'glance');
  const cameras = useCameras();
  const entities = useEntities();
  const [sims, setSims] = useState<Record<string, Sim>>({});
  const [motionSim, setMotionSim] = useState<Record<string, boolean>>({});
  const [focus, setFocus] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  // Real Unavailable wins; otherwise what the bar says.
  const effective: Record<string, Sim> = {};
  const motion: Record<string, boolean> = {};
  for (const c of cameras) {
    effective[c.id] = c.unavailable ? 'unavailable' : (sims[c.id] ?? 'live');
    const sensor = entities.get(`binary_sensor.${c.id.split('.')[1]}_movimento`);
    motion[c.id] = (motionSim[c.id] ?? false) || sensor?.state === 'on';
  }

  const retry = (id: string) => setSims(s => ({ ...s, [id]: 'live' }));

  const chip: React.CSSProperties = {
    border: '1px solid #111',
    borderRadius: 999,
    padding: '2px 8px',
    background: 'transparent',
    font: 'inherit',
    cursor: 'pointer',
    color: '#111',
  };

  return (
    <Ctx.Provider
      value={{ variant, leftFeed: left === 'feed', sims: effective, motion, focus, setFocus, fullscreen, setFullscreen, retry }}
    >
      {children}
      <PrototypeSwitcher variants={VARIANTS} current={variant} onChange={setVariant}>
        <span style={{ opacity: 0.4 }}>|</span>
        {cameras.map(c => {
          const short = c.name.replace(/^Telecamera\s+/i, '');
          const sim = effective[c.id];
          return (
            <span key={c.id} style={{ display: 'inline-flex', gap: 2 }}>
              <button
                style={{ ...chip, background: sim === 'live' ? 'transparent' : '#111', color: sim === 'live' ? '#111' : '#ffe14d' }}
                title='Cambia stato del Feed'
                onClick={() => setSims(s => ({ ...s, [c.id]: SIMS[(SIMS.indexOf(sim) + 1) % SIMS.length] }))}
              >
                {short}: {SIM_LABEL[sim]}
              </button>
              <button
                style={{ ...chip, background: motion[c.id] ? '#111' : 'transparent', color: motion[c.id] ? '#ffe14d' : '#111' }}
                title='Simula movimento'
                onClick={() => setMotionSim(m => ({ ...m, [c.id]: !m[c.id] }))}
              >
                🚶
              </button>
            </span>
          );
        })}
        <span style={{ opacity: 0.4 }}>|</span>
        <button style={chip} onClick={() => setLeft(left === 'feed' ? 'glance' : 'feed')}>
          left: {left === 'feed' ? 'Feed' : 'glance'}
        </button>
      </PrototypeSwitcher>
      <FullscreenFeed />
    </Ctx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* The fake live picture (a stand-in for the WebRTC <video>)           */
/* ------------------------------------------------------------------ */

const KEYFRAMES = `
@keyframes proto-walk { from { transform: translateX(-10%); } to { transform: translateX(110%); } }
@keyframes proto-grain { 0% { transform: translate(0,0); } 25% { transform: translate(-3%,2%); } 50% { transform: translate(2%,-3%); } 75% { transform: translate(-2%,-1%); } 100% { transform: translate(0,0); } }
@keyframes proto-spin { to { transform: rotate(360deg); } }
@keyframes proto-pulse { 0%,100% { opacity: .35; } 50% { opacity: .7; } }
@keyframes proto-blink { 0%,100% { opacity: 1; } 50% { opacity: .2; } }
`;

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return now;
}

/** A drawn outdoor scene per camera, so three Feeds are told apart at a glance. */
function FakePicture({ id, motion, fit = 'cover', osd = true }: { id: string; motion: boolean; fit?: 'cover' | 'contain'; osd?: boolean }) {
  const now = useClock();
  const seed = [...id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  // Gate, pedestrian gate, garden: by name, so the fixture's three differ.
  const kind = id.includes('cancelletto') ? 1 : id.includes('cancello') ? 0 : id.includes('giardino') ? 2 : seed % 3;
  const ts = now.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'medium' });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }}>
      <svg
        viewBox='0 0 160 90'
        preserveAspectRatio={fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id={`sky${seed}`} x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0' stopColor='#5f7486' />
            <stop offset='1' stopColor='#9aa7ae' />
          </linearGradient>
        </defs>
        <rect width='160' height='90' fill={`url(#sky${seed})`} />
        <rect y='52' width='160' height='38' fill={kind === 2 ? '#4d5d3a' : '#6a6862'} />
        {kind === 0 && (
          <g fill='#2b2b2b'>
            <rect x='30' y='30' width='100' height='3' />
            {Array.from({ length: 21 }, (_, i) => (
              <rect key={i} x={30 + i * 5} y='30' width='1.4' height='26' />
            ))}
            <rect x='26' y='24' width='5' height='34' fill='#8c857a' />
            <rect x='129' y='24' width='5' height='34' fill='#8c857a' />
          </g>
        )}
        {kind === 1 && (
          <g>
            <rect x='60' y='22' width='40' height='36' fill='#8c857a' />
            <rect x='68' y='28' width='24' height='30' fill='#33302b' />
            <rect x='0' y='40' width='60' height='14' fill='#b3aa9a' />
            <rect x='100' y='40' width='60' height='14' fill='#b3aa9a' />
          </g>
        )}
        {kind === 2 && (
          <g fill='#2f3f24'>
            <circle cx='25' cy='40' r='14' />
            <circle cx='60' cy='36' r='18' />
            <circle cx='130' cy='42' r='12' />
            <rect x='0' y='60' width='160' height='3' fill='#7b6f5a' />
          </g>
        )}
        {motion && (
          <g style={{ animation: 'proto-walk 6s linear infinite' }}>
            <circle cx='0' cy='48' r='3' fill='#1a1a1a' />
            <rect x='-3' y='51' width='6' height='12' rx='2' fill='#1a1a1a' />
          </g>
        )}
      </svg>
      {/* Grain, so it reads as video rather than a picture. */}
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          opacity: 0.12,
          backgroundImage: 'radial-gradient(#fff 0.6px, transparent 0.8px)',
          backgroundSize: '3px 3px',
          animation: 'proto-grain 0.4s steps(4) infinite',
          pointerEvents: 'none',
        }}
      />
      {/* Burned-in OSD, as EZVIZ cameras do. */}
      {osd && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            left: 8,
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#fff',
            textShadow: '0 0 2px #000',
          }}
        >
          {ts}
        </span>
      )}
    </div>
  );
}

/**
 * Loading resolves itself after a moment, as a real WebRTC session would;
 * the bar's "carica" holds it there so the loading look can be judged.
 */
function usePhase(id: string): Sim {
  const { sims } = useProto();
  const sim = sims[id] ?? 'live';
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (sim !== 'live') return;
    const timer = setTimeout(() => setConnected(true), 1200);
    return () => {
      clearTimeout(timer);
      setConnected(false);
    };
  }, [sim]);
  if (sim === 'live' && !connected) return 'loading';
  return sim;
}

/* ------------------------------------------------------------------ */
/* Variant A -- Griglia: equal grid, everything overlaid in the frame   */
/* ------------------------------------------------------------------ */

function FrameA({ camera, onTap, big }: { camera: Entity; onTap?: () => void; big?: boolean }) {
  const { motion, retry } = useProto();
  const phase = usePhase(camera.id);
  const moving = motion[camera.id];
  const fault = phase === 'unavailable';
  return (
    <div
      role={onTap && !fault ? 'button' : undefined}
      onClick={onTap && !fault ? onTap : undefined}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 0,
        borderRadius: t.radius.tile,
        overflow: 'hidden',
        border: `${fault ? 2 : moving ? 3 : 1}px solid ${fault ? t.color.fault : moving ? t.color.activeStrong : t.color.border}`,
        background: fault ? t.color.faultSurface : '#000',
        cursor: onTap && !fault ? 'pointer' : 'default',
        boxSizing: 'border-box',
      }}
    >
      {phase === 'live' && <FakePicture id={camera.id} motion={moving} fit={big ? 'contain' : 'cover'} />}
      {phase !== 'live' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: t.space.sm,
            color: fault ? t.color.fault : t.color.textSecondary,
          }}
        >
          {phase === 'loading' && (
            <>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: `4px solid ${t.color.border}`,
                  borderTopColor: t.color.textPrimary,
                  animation: 'proto-spin 0.9s linear infinite',
                }}
              />
              <span style={{ fontSize: t.font.body }}>Connessione…</span>
            </>
          )}
          {phase === 'failed' && (
            <>
              <Icon name='mdi:video-off-outline' size={40} />
              <span style={{ fontSize: t.font.body, fontWeight: 600, color: t.color.textPrimary }}>Video non disponibile</span>
              <button
                onClick={e => {
                  e.stopPropagation();
                  retry(camera.id);
                }}
                style={{
                  minHeight: t.touch.floor,
                  padding: `0 ${t.space.lg}px`,
                  borderRadius: t.radius.pill,
                  border: `1px solid ${t.color.border}`,
                  background: t.color.surfaceRaised,
                  color: t.color.textPrimary,
                  fontSize: t.font.body,
                  fontWeight: 600,
                }}
              >
                Riprova
              </button>
            </>
          )}
          {fault && (
            <>
              <Icon name='mdi:cctv-off' size={44} />
              <span style={{ fontSize: t.font.glanceM, fontWeight: 700 }}>Non disponibile</span>
            </>
          )}
        </div>
      )}
      {/* Name, bottom-left, on a scrim. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: `${t.space.lg}px ${t.space.md}px ${t.space.sm}px`,
          background: 'linear-gradient(transparent, rgb(0 0 0 / 0.75))',
          display: 'flex',
          alignItems: 'center',
          gap: t.space.sm,
          color: fault ? t.color.fault : '#fff',
          fontSize: big ? t.font.glanceM : t.font.body,
          fontWeight: 600,
        }}
      >
        <Icon name={fault ? 'mdi:cctv-off' : 'mdi:cctv'} size={big ? 26 : 20} />
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{camera.name}</span>
        {phase === 'live' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: t.font.caption }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e33', animation: 'proto-blink 1.6s infinite' }} /> LIVE
          </span>
        )}
      </div>
      {moving && !fault && (
        <span
          style={{
            position: 'absolute',
            top: t.space.sm,
            right: t.space.sm,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: t.radius.pill,
            background: t.color.activeStrong,
            color: t.color.onActiveStrong,
            fontSize: t.font.caption,
            fontWeight: 700,
          }}
        >
          <Icon name='mdi:motion-sensor' size={16} /> Movimento
        </span>
      )}
    </div>
  );
}

function PageA({ cameras }: { cameras: Entity[] }) {
  const { setFullscreen } = useProto();
  const cols = cameras.length <= 1 ? 1 : cameras.length <= 4 ? 2 : 3;
  const rows = Math.ceil(cameras.length / cols);
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: t.space.sm,
      }}
    >
      {cameras.map(c => (
        <FrameA key={c.id} camera={c} onTap={() => setFullscreen(c.id)} />
      ))}
    </div>
  );
}

function LeftA({ camera }: { camera: Entity }) {
  const { setFullscreen } = useProto();
  return (
    <div style={{ flex: '0 0 auto', aspectRatio: '16 / 9' }}>
      <FrameA camera={camera} onTap={() => setFullscreen(camera.id)} />
    </div>
  );
}

function FullscreenFeed() {
  const { fullscreen, setFullscreen, variant } = useProto();
  const entities = useEntities();
  const camera = fullscreen ? entities.get(fullscreen) : undefined;
  if (variant !== 'A' || !camera) return null;
  return (
    <div
      onClick={() => setFullscreen(null)}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: '#000', padding: t.space.lg, boxSizing: 'border-box' }}
    >
      <FrameA camera={camera} big />
      <button
        onClick={() => setFullscreen(null)}
        aria-label='Chiudi'
        style={{
          position: 'absolute',
          top: t.space.lg + t.space.sm,
          right: t.space.lg + t.space.sm,
          width: t.touch.primary,
          height: t.touch.primary,
          borderRadius: '50%',
          border: 'none',
          background: 'rgb(0 0 0 / 0.6)',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Icon name='mdi:close' size={34} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Variant B -- Principale + striscia: one big, the rest as thumbnails  */
/* ------------------------------------------------------------------ */

function StateB({ phase, size }: { phase: Sim; size: 'big' | 'small' }) {
  const [left, setLeft] = useState(5);
  useEffect(() => {
    if (phase !== 'failed') return;
    const i = setInterval(() => setLeft(s => (s <= 1 ? 5 : s - 1)), 1000);
    return () => clearInterval(i);
  }, [phase]);
  if (phase === 'live') return null;
  const fault = phase === 'unavailable';
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.space.xs,
        background: fault ? t.color.faultSurface : t.color.surface,
        color: fault ? t.color.fault : t.color.textSecondary,
        animation: phase === 'loading' ? 'proto-pulse 1.4s ease-in-out infinite' : undefined,
      }}
    >
      <Icon name={fault ? 'mdi:cctv-off' : phase === 'failed' ? 'mdi:reload-alert' : 'mdi:cctv'} size={size === 'big' ? 56 : 28} />
      {size === 'big' && phase === 'failed' && <span style={{ fontSize: t.font.body }}>Nuovo tentativo tra {left} s</span>}
    </div>
  );
}

function CaptionB({ camera, phase, big }: { camera: Entity; phase: Sim; big?: boolean }) {
  const { motion } = useProto();
  const moving = motion[camera.id];
  const fault = phase === 'unavailable';
  const status = fault
    ? 'Non disponibile'
    : phase === 'failed'
      ? 'Riconnessione…'
      : phase === 'loading'
        ? 'Connessione…'
        : moving
          ? 'Movimento'
          : 'In diretta';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: t.space.sm,
        padding: `${t.space.xs}px ${t.space.xs}px 0`,
        fontSize: big ? t.font.glanceM : t.font.caption,
        fontWeight: 600,
      }}
    >
      <span
        style={{ color: fault ? t.color.fault : t.color.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {camera.name}
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: big ? t.font.body : t.font.caption,
          color: fault ? t.color.fault : moving && phase === 'live' ? t.color.activeStrong : t.color.textSecondary,
        }}
      >
        {status}
      </span>
    </div>
  );
}

function ThumbB({ camera, onTap, selected }: { camera: Entity; onTap?: () => void; selected?: boolean }) {
  const { motion } = useProto();
  const phase = usePhase(camera.id);
  return (
    <div role={onTap ? 'button' : undefined} onClick={onTap} style={{ cursor: onTap ? 'pointer' : 'default', flex: '0 0 auto' }}>
      <div
        style={{
          position: 'relative',
          aspectRatio: '16 / 9',
          borderRadius: t.radius.tile,
          overflow: 'hidden',
          outline: selected ? `3px solid ${t.color.textPrimary}` : undefined,
          border: `1px solid ${phase === 'unavailable' ? t.color.fault : t.color.border}`,
        }}
      >
        {phase === 'live' && <FakePicture id={camera.id} motion={motion[camera.id]} osd={false} />}
        <StateB phase={phase} size='small' />
      </div>
      <CaptionB camera={camera} phase={phase} />
    </div>
  );
}

function PageB({ cameras }: { cameras: Entity[] }) {
  const { focus, setFocus, motion } = useProto();
  const hero = cameras.find(c => c.id === focus) ?? cameras.find(c => motion[c.id]) ?? cameras[0];
  const phase = usePhase(hero?.id ?? '');
  if (!hero) return null;
  const others = cameras.filter(c => c.id !== hero.id);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: t.space.lg }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            position: 'relative',
            flex: 1,
            minHeight: 0,
            borderRadius: t.radius.tile,
            overflow: 'hidden',
            background: '#000',
            border: `1px solid ${phase === 'unavailable' ? t.color.fault : t.color.border}`,
          }}
        >
          {phase === 'live' && <FakePicture id={hero.id} motion={motion[hero.id]} fit='contain' />}
          <StateB phase={phase} size='big' />
        </div>
        <CaptionB camera={hero} phase={phase} big />
      </div>
      <div style={{ flex: '0 0 300px', display: 'flex', flexDirection: 'column', gap: t.space.md, overflowY: 'auto' }}>
        {others.map(c => (
          <ThumbB key={c.id} camera={c} onTap={() => setFocus(c.id)} />
        ))}
      </div>
    </div>
  );
}

function LeftB({ camera }: { camera: Entity }) {
  const { openPage } = useNavigation();
  const { setFocus } = useProto();
  return (
    <ThumbB
      camera={camera}
      onTap={() => {
        setFocus(camera.id);
        openPage(PROTO_PAGE);
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Variant C -- Righe: each camera a Row; the tapped one expands        */
/* ------------------------------------------------------------------ */

function RowC({ camera, expanded, onTap }: { camera: Entity; expanded: boolean; onTap: () => void }) {
  const { motion } = useProto();
  const phase = usePhase(camera.id);
  const moving = motion[camera.id];
  const fault = phase === 'unavailable';
  const status = fault
    ? 'Non disponibile'
    : phase === 'failed'
      ? 'Video non riuscito'
      : phase === 'loading'
        ? 'Connessione…'
        : moving
          ? 'Movimento adesso'
          : 'Nessun movimento';
  return (
    <div
      style={{
        flex: expanded ? 1 : '0 0 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: t.radius.tile,
        overflow: 'hidden',
        border: `1px solid ${fault ? t.color.fault : t.color.border}`,
        background: fault ? t.color.faultSurface : t.color.surface,
        boxShadow: moving && !fault ? `inset 6px 0 0 ${t.color.activeStrong}` : undefined,
      }}
    >
      <div
        role='button'
        onClick={onTap}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: t.space.md,
          padding: t.space.sm,
          paddingLeft: t.space.md,
          minHeight: t.layout.rowRoom,
          cursor: 'pointer',
        }}
      >
        {/* A small live picture even when collapsed: a Feed is always live. */}
        <div
          style={{
            position: 'relative',
            flex: '0 0 auto',
            width: 108,
            aspectRatio: '16 / 9',
            borderRadius: t.radius.sm,
            overflow: 'hidden',
            background: '#000',
          }}
        >
          {phase === 'live' && !expanded && <FakePicture id={camera.id} motion={moving} osd={false} />}
          {(phase !== 'live' || expanded) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                color: fault ? t.color.fault : t.color.textSecondary,
                background: t.color.surfaceRaised,
              }}
            >
              <Icon name={fault ? 'mdi:cctv-off' : phase === 'failed' ? 'mdi:video-off-outline' : 'mdi:cctv'} size={26} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontSize: t.font.glanceM,
              fontWeight: 600,
              color: fault ? t.color.fault : t.color.textPrimary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {camera.name}
          </span>
          <span
            style={{
              fontSize: t.font.body,
              color: fault ? t.color.fault : moving && phase === 'live' ? t.color.activeStrong : t.color.textSecondary,
            }}
          >
            {status}
          </span>
        </div>
        <Icon name={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} size={30} color={t.color.textSecondary} />
      </div>
      {expanded && (
        <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#000' }}>
          {phase === 'live' ? (
            <FakePicture id={camera.id} motion={moving} fit='contain' />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                color: fault ? t.color.fault : t.color.textSecondary,
              }}
            >
              <Icon name={fault ? 'mdi:cctv-off' : phase === 'failed' ? 'mdi:video-off-outline' : 'mdi:loading'} size={64} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PageC({ cameras }: { cameras: Entity[] }) {
  const { focus, setFocus } = useProto();
  const open = focus ?? cameras[0]?.id ?? null;
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: t.space.sm }}>
      {cameras.map(c => (
        <RowC key={c.id} camera={c} expanded={c.id === open} onTap={() => setFocus(c.id === open ? '' : c.id)} />
      ))}
    </div>
  );
}

function LeftC({ camera }: { camera: Entity }) {
  const { openPage } = useNavigation();
  const { setFocus } = useProto();
  return (
    <RowC
      camera={camera}
      expanded={false}
      onTap={() => {
        setFocus(camera.id);
        openPage(PROTO_PAGE);
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Entry points used by PlacementView                                   */
/* ------------------------------------------------------------------ */

/** Several cameras Placed in `right` (or a full-width Region). */
export function FeedsProto({ cameras }: { cameras: Entity[] }) {
  const { variant } = useProto();
  return (
    <>
      <style>{KEYFRAMES}</style>
      {variant === 'B' ? <PageB cameras={cameras} /> : variant === 'C' ? <PageC cameras={cameras} /> : <PageA cameras={cameras} />}
    </>
  );
}

/** One camera as a Feed in the narrow `left` column. */
export function LeftFeedProto({ camera }: { camera: Entity }) {
  const { variant } = useProto();
  return (
    <>
      <style>{KEYFRAMES}</style>
      {variant === 'B' ? <LeftB camera={camera} /> : variant === 'C' ? <LeftC camera={camera} /> : <LeftA camera={camera} />}
    </>
  );
}

export function useLeftFeedOn(): boolean {
  return useProto().leftFeed;
}
