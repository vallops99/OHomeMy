/**
 * PROTOTYPE -- throwaway. The floating variant switcher for UI prototypes
 * (the `prototype` skill). Not part of the panel: it is dev-only, and it
 * lives on a `prototype/*` branch, never on master.
 *
 * `?variant=` in the URL is the source of truth, so a variant is shareable and
 * survives reload. `←`/`→` cycle, except while typing in a field.
 */
import { useEffect, useState, type ReactNode } from 'react';

export function useUrlParam(name: string, fallback: string): [string, (v: string) => void] {
  const read = () => new URLSearchParams(window.location.search).get(name) ?? fallback;
  const [value, setValue] = useState(read);
  const set = (v: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set(name, v);
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`);
    setValue(v);
  };
  return [value, set];
}

export function PrototypeSwitcher({
  variants,
  current,
  onChange,
  children,
}: {
  variants: { key: string; name: string }[];
  current: string;
  onChange: (key: string) => void;
  /** Extra prototype controls, rendered to the right of the variant label. */
  children?: ReactNode;
}) {
  const i = Math.max(
    0,
    variants.findIndex(v => v.key === current)
  );
  const step = (d: number) => onChange(variants[(i + d + variants.length) % variants.length].key);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!import.meta.env.DEV) return null;

  const btn: React.CSSProperties = {
    background: 'transparent',
    color: '#111',
    border: 'none',
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    padding: '4px 10px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 6,
        transform: 'translateX(-50%)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px',
        borderRadius: 999,
        background: '#ffe14d',
        color: '#111',
        boxShadow: '0 4px 18px rgb(0 0 0 / 0.6)',
        font: '600 13px system-ui, sans-serif',
        whiteSpace: 'nowrap',
      }}
    >
      <button style={btn} onClick={() => step(-1)} aria-label='Variante precedente'>
        ◀
      </button>
      <span>
        {variants[i].key} ({variants[i].name})
      </span>
      <button style={btn} onClick={() => step(1)} aria-label='Variante successiva'>
        ▶
      </button>
      {children}
    </div>
  );
}
