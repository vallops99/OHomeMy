/**
 * The panel build's entry: the custom element Home Assistant mounts for a
 * Dashboard (`panel_custom`, `embed_iframe: false`). `main.tsx` beside
 * `App.tsx` stays the entry for the standalone page and the dev server.
 *
 * Inside Home Assistant the renderer runs in HA's own document, under HA's
 * shadow DOM, on HA's own websocket. Three things follow, each confirmed on
 * the live instance in docs/research/hakit-in-a-panel.md:
 *
 * 1. Styles. The element renders into its own shadow root, and everything
 *    that styles the Dashboard goes in there with it: `index.css` below,
 *    every emotion cache (`emotionCache.ts`), and @hakit's portals.
 * 2. Remounts. One React root for the page, rendered once into `tree.ts`'s
 *    nodes and never unmounted; each new element moves the tree into its
 *    shadow root. HassConnect therefore connects exactly once.
 * 3. Suspend. HA owns its connection; `App` turns @hakit's hidden-tab
 *    handling off when given `panel`.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import indexCss from '../index.css?inline';
import { panelStore, type PanelInfo, type PanelRoute } from './panelProps';
import { app, portalRoot, styles, tree } from './tree';

const ELEMENT = 'ohomemy-dashboard';

/**
 * Casa Panel's face (ADR-0013), as `index.html` loads it. An `@font-face`
 * inside a shadow root is ignored, but one in the document is seen by every
 * shadow tree, so this one link goes in Home Assistant's `<head>`.
 */
const FONTS = 'https://fonts.googleapis.com/css2?family=Geist:wght@200;300;400;500;600;700&display=swap';

/**
 * The element fills the panel area Home Assistant gives it, which for a
 * custom panel is the whole viewport (it has no toolbar). In the viewport's
 * units, not `100%`: `ha-panel-custom` sits in an inline
 * `partial-panel-resolver` and has no definite height, so `100%` is only as
 * tall as the content, and a proportional grid takes its rows from the
 * height it is given, not the reverse (#50, measured: 0 px). Important,
 * because @hakit's global `html, body { height: 100% }` becomes a `:host`
 * rule too (`hostSelectors.ts`) and is inserted after this one.
 */
const HOST_CSS = ':host { display: block; height: 100vh !important; height: 100dvh !important; }';

function style(css: string) {
  const node = document.createElement('style');
  node.textContent = css;
  return node;
}

let started = false;

/** Everything done once per page, on the first element's connect. */
function start() {
  if (started) return;
  started = true;
  styles.append(style(HOST_CSS), style(indexCss));
  if (!document.head.querySelector(`link[href="${FONTS}"]`)) {
    document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS }));
  }
  createRoot(app).render(
    <StrictMode>
      <App panel={{ portalRoot }} />
    </StrictMode>
  );
}

class DashboardElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    start();
    this.shadowRoot!.append(tree);
  }

  // No disconnectedCallback: the tree stays in this detached shadow root
  // until the next element takes it, and the React root keeps running.

  get panel() {
    return panelStore.get().panel;
  }
  set panel(panel: PanelInfo | null) {
    panelStore.set({ panel });
  }
  get route() {
    return panelStore.get().route;
  }
  set route(route: PanelRoute | null) {
    panelStore.set({ route });
  }
  get narrow() {
    return panelStore.get().narrow;
  }
  set narrow(narrow: boolean) {
    panelStore.set({ narrow });
  }
}

// A second copy of the module (a cache-busted `module_url`) must not throw.
if (!customElements.get(ELEMENT)) customElements.define(ELEMENT, DashboardElement);
