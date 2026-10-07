import { HassConnect } from '@hakit/core';
import { useMemo } from 'react';
import { useHakitLocale } from './ha';
import Dashboard from './Dashboard';
import { Renderer } from './renderer/Renderer';
import { HakitTheme } from './ui';

type AppProps = {
  /**
   * Set when the renderer runs as a Home Assistant panel (`src/panel`).
   * There it is HA's own page, so HassConnect takes HA's connection
   * (`window.hassConnection`) and needs neither a URL from `.env` nor a
   * token.
   */
  panel?: { portalRoot: HTMLElement };
};

/**
 * Home Assistant suspends its own connection when the tab is hidden, or does
 * not, per the browser's "suspend when hidden" setting. Left on, @hakit
 * closes that same borrowed socket after five minutes hidden even where HA
 * was told not to (docs/research/hakit-in-a-panel.md, section 5).
 * Module-level so its identity is stable: HassConnect's connect callback
 * depends on it.
 */
const PANEL_RESUME = { suspendWhenHidden: false };

/**
 * The dev server reaches the document-driven renderer with
 * `?dashboard=<slug>` (src/renderer/select.ts); without it, it still shows
 * the label-driven `Dashboard` until the cutover (#61). Inside Home Assistant
 * a panel is always a Dashboard of the document.
 */
const DEV_DASHBOARD = new URLSearchParams(window.location.search).has('dashboard');

function App({ panel }: AppProps) {
  // @hakit takes its language from the server, not from whoever is looking,
  // so its own surfaces (the entity dialog) are given the viewer's (#59).
  // A change remounts what @hakit wraps, which on a Dashboard only costs
  // where it was left.
  const locale = useHakitLocale();
  const options = useMemo(
    () => ({ locale, ...(panel && { portalRoot: panel.portalRoot, handleResumeOptions: PANEL_RESUME }) }),
    [locale, panel]
  );
  return (
    <HassConnect
      hassUrl={import.meta.env.DEV && !panel ? import.meta.env.VITE_HA_URL : window.location.origin}
      hassToken={panel ? undefined : import.meta.env.VITE_HA_TOKEN}
      options={options}
    >
      {/* Drives @hakit's own surfaces -- the entity modal above all -- from
          our tokens. See src/ui/HakitTheme.tsx. */}
      <HakitTheme />
      {panel || DEV_DASHBOARD ? <Renderer /> : <Dashboard />}
    </HassConnect>
  );
}

export default App;
