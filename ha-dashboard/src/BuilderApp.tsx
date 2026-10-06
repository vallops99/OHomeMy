import { HassConnect } from '@hakit/core';
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
  return (
    <HassConnect hassUrl={window.location.origin} options={{ portalRoot, handleResumeOptions: PANEL_RESUME }}>
      {/* Casa Panel's tokens as custom properties, which the Builder's CSS reads. */}
      <HakitTheme />
      <Builder />
    </HassConnect>
  );
}
