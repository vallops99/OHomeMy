import { HassConnect } from '@hakit/core';
import { useMemo, useState } from 'react';
import { useHakitLocale } from './ha';
import { Builder } from './builder/Builder';
import { HakitTheme } from './ui';

/** As `App`'s: HA owns the borrowed connection's suspend (docs/research/hakit-in-a-panel.md, section 5). */
const PANEL_RESUME = { suspendWhenHidden: false };

/**
 * The Builder's root, as `App` is the renderer's: inside its Home Assistant
 * panel, on HA's own connection (`window.hassConnection`), with no URL and
 * no token. @hakit is here although #55 needs only the websocket, because
 * the Builder's preview is the renderer itself (ADR-0015).
 */
export default function BuilderApp({ portalRoot }: { portalRoot: HTMLElement }) {
  // The viewer's language for @hakit's own surfaces (#59), as `App` gives
  // it, but the first one only: a change of language makes @hakit unmount
  // everything it wraps while it fetches the new words, and here that is
  // an unpublished Draft. The Builder's own words still follow at once.
  const live = useHakitLocale();
  const [locale, setLocale] = useState(live);
  if (locale === undefined && live !== undefined) setLocale(live);
  const options = useMemo(() => ({ locale, portalRoot, handleResumeOptions: PANEL_RESUME }), [locale, portalRoot]);
  return (
    <HassConnect hassUrl={window.location.origin} options={options}>
      {/* Casa Panel's tokens as custom properties, which the Builder's CSS reads. */}
      <HakitTheme />
      <Builder />
    </HassConnect>
  );
}
