/**
 * The Builder build's entry (#55): `<ohomemy-builder>`, the custom element
 * of the admin-only "OHomeMy Builder" panel (`panels.py`).
 *
 * Mounted exactly as a Dashboard is (`src/panel/main.tsx`, and why in
 * docs/research/hakit-in-a-panel.md): a shadow root holding every style, one
 * React root per page moved into each new element, HA's own connection.
 * This is a separate bundle, so its `tree.ts`, emotion caches and @hakit are
 * its own, and a page that opened both a Dashboard and the Builder runs one
 * of each.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import BuilderApp from '../BuilderApp';
import { hassPatch, panelStore, type PanelInfo, type PanelRoute } from '../panel/panelProps';
import { SCRIPT_CSS } from '../i18n/scriptCss';
import { app, portalRoot, styles, tree } from '../panel/tree';
import { CASA } from '../theme/tokens';
import builderCss from './builder.css?inline';
import dashboardScreenCss from './dashboardScreen.css?inline';

const ELEMENT = 'ohomemy-builder';

const FONTS = 'https://fonts.googleapis.com/css2?family=Geist:wght@200;300;400;500;600;700&display=swap';

/**
 * Casa Panel's named type styles as custom properties (`--type-body-size`,
 * `--type-body-line`, `--type-body-weight`), for `builder.css`: the shared
 * token variables carry colour, space, radius and size, but not type.
 */
const TYPE_CSS = `:host {\n${Object.entries(CASA.type)
  .map(([name, t]) => {
    const n = name.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
    return `--type-${n}-size: ${t.size}px; --type-${n}-line: ${t.lineHeight}; --type-${n}-weight: ${t.weight}; --type-${n}-tracking: ${t.letterSpacing};`;
  })
  .join('\n')}\n}`;

const HOST_CSS = ':host { display: block; height: 100%; }';

function style(css: string) {
  const node = document.createElement('style');
  node.textContent = css;
  return node;
}

let started = false;

function start() {
  if (started) return;
  started = true;
  styles.append(style(HOST_CSS), style(TYPE_CSS), style(SCRIPT_CSS), style(builderCss), style(dashboardScreenCss));
  if (!document.head.querySelector(`link[href="${FONTS}"]`)) {
    document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FONTS }));
  }
  createRoot(app).render(
    <StrictMode>
      <BuilderApp portalRoot={portalRoot} />
    </StrictMode>
  );
}

class BuilderElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    start();
    this.shadowRoot!.append(tree);
  }

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
  /** Only the viewer's locale and the server's time zone are kept (`panelProps.ts`). */
  set hass(hass: unknown) {
    panelStore.set(hassPatch(hass));
  }
}

if (!customElements.get(ELEMENT)) customElements.define(ELEMENT, BuilderElement);
