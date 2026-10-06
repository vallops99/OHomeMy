# A Dashboard mounted as a Home Assistant panel

Research for [#46](https://github.com/vallops99/homeassistant-frontend/issues/46),
the spike under [ADR-0015](../adr/0015-ohomemy-a-builder-owns-the-layout.md).
ADR-0015's "Running inside a panel" lists three problems with @hakit that were
found by reading code ([layout-storage.md §7.7](layout-storage.md)). This note
checks each one against the live Home Assistant, and records the workarounds
that held.

- **Date:** 2026-10-06
- **Versions:** Home Assistant **2026.9.2** (the `ha-local` container, with
  the frontend it bundles), `@hakit/core` and `@hakit/components` **6.0.2**,
  `home-assistant-js-websocket` **9.7.0**, `@emotion/cache` **11.14.0**, React
  19, Chromium from `flake.nix`.
- **Marking:** **[measured]** means observed on `ha-local` or in Chromium.
  **[read]** means read in source. **[inferred]** means neither.

---

## 1. Answer in brief

| ADR-0015 problem | Verdict | Workaround that held |
|---|---|---|
| 1. Styles go into `document.head` and never reach HA's shadow DOM | **Confirmed**, and worse: they also restyle HA's own page | Shadow root per element. Every emotion cache redirected into it at build time, because a `CacheProvider` cannot reach @hakit's private emotion copies. Non-speedy sheets. `:root`/`html`/`body` rewritten to `:host`. Portals inside the shadow root. Fonts in HA's `<head>` |
| 2. HassConnect cannot reconnect after a remount | **Confirmed**, both on navigating away and back and after 5 minutes hidden | One React root per page, never unmounted, moved into each new element's shadow root |
| 3. @hakit's hidden-tab handling suspends HA's connection | **Confirmed**, and worse: it closes HA's socket even when HA is told not to | `handleResumeOptions: { suspendWhenHidden: false }`. Leaves a residual `freeze` handler, which goes upstream |

With the workarounds, the panel survives navigating away and back, and five
minutes hidden, with its styles intact and its data live **[measured]**.

Also confirmed: **inherited auth works as §7.7 read it.** Inside the panel,
HassConnect takes `window.hassConnection`. Loading the panel opens no
websocket of its own. HA's frontend opens two sockets on any page, with or
without the panel **[measured]**.

## 2. How it was tested

- **A throwaway integration** (`ohomemy_spike`, never committed) registered two
  panels with `panel_custom.async_register_panel(..., webcomponent_name=
  "ohomemy-dashboard", embed_iframe=False, require_admin=False,
  config={"dashboard_id": ...})`:
  - `/ohomemy-naive`: the renderer mounted the obvious way, with a
    `createRoot` in `connectedCallback`, `unmount` in `disconnectedCallback`,
    and `App` as it was.
  - `/ohomemy-spike`: the panel build in this commit (§7).
  - Each served its module from a static path, cache-busted by mtime.
- **Playwright on `$CHROME`**, logged in by putting the dev long-lived token
  into HA's `hassTokens`. Navigation used HA's own `history.pushState` plus
  `location-changed`, as its sidebar does.
- **Hiding a tab is simulated.** Headless Chromium never reports a tab as
  hidden, whether behind another tab or minimized, and
  `Page.setWebLifecycleState` fires no `freeze` event **[measured]**. The
  probe therefore overrides `document.hidden` and `visibilityState` and
  dispatches `visibilitychange`, and dispatches `freeze`/`resume` by hand.
  Both HA (`_checkVisibility`) and @hakit (`handleSuspendResume`) read only
  these **[read]**.
- **Liveness** was checked by setting `sensor.generale_quadro_sonoff_…_power`
  to 321 through the REST API, reading "321 W in uso" off the panel, and then
  setting it back to 320.0.

## 3. Styles

### Confirmed [measured]

The naive mount, at first load:

- `document.head` held emotion's `<style>` tags (keys `css` and
  `hakit-global`), and the panel's subtree held none. The one emotion-styled
  element inside the panel had its rule only in the head, where it cannot
  match through HA's shadow roots.
- @hakit's `:root` variables and `HakitTheme`'s `body` rule landed on **HA's
  own page**: `<html>` got `--ha-h: 90`, and HA's `<body>` took Casa Panel's
  ground `rgb(14, 15, 13)`.
- Geist did not load, because `index.html`'s font link is not part of the
  module, so the panel fell back to the system face.
- After navigating away and back, the HassConnect loader that came up was
  **invisible**. Its styled-component CSS was in the head.

This is easy to miss. Most of the Dashboard still looked right, because our
components style themselves inline from `t` tokens. The damage is to
everything emotion styles, to @hakit's own surfaces, and to HA itself.

### Why a `CacheProvider` is not enough [read, measured]

The plan in §7.7 was a `CacheProvider` with a cache whose container is the
shadow root. That reaches only consumers of the *shared* `@emotion/react`:

- `@hakit/core` and `@hakit/components` each **bundle a private copy of
  emotion's element module**, with its own cache context and a default cache
  (`createCache({ key: "css" })` on `document.head`). Components that use the
  `css` prop go through that copy, which is 87 modules in
  `@hakit/components`. The panel bundle contains three separate
  `createContext(createCache({key: "css"}))` calls.
- @hakit's `ThemeProvider` wraps its children in its own `CacheProvider`,
  `{ key: "hakit", container: win.document.head }`, unless it is given
  `emotionCache`.

What all three copies share is the import of `@emotion/cache`. The panel
build replaces that import, for every importer, with
`src/panel/emotionCache.ts`, which forces `container` into the shadow root.
Afterwards `document.head` held no emotion tags, the panel's shadow root held
108, and every emotion-styled element sampled had its rule in the shadow root
**[measured]**.

### Three more things the shadow root needs

- **`speedy: false`.** In production emotion writes rules with `insertRule`.
  A `<style>` filled that way loses those rules when it is moved, and the tree
  moves on every remount (§4). In Chromium, after moving a box between two
  shadow roots, an `insertRule`'d sheet went from 1 rule to 0 while a
  text-node sheet kept its 1 **[measured]**. This is per spec: a moved
  `<style>` gets a fresh sheet built from its text.
- **`:root`, `html` and `body` match nothing in a shadow root.** That is where
  @hakit's ~700 variables and `HakitTheme`'s tokens and page shell go. A stylis
  plugin rewrites those selectors to `:host`, so the variables land on the
  panel element and inherit from there (`src/panel/hostSelectors.ts`, tested).
  This also stops the leak onto HA's page.
- **Portals.** @hakit's modal goes to `portalRoot`, which defaults to
  `document.body`. `ConcernList` and `SelectTile` used `document.body`
  themselves. All of them now portal to a node in the shadow root
  (`usePortalRoot()` in `src/ha`). With the fix, the alarm modal and the
  Concern list both rendered inside the shadow root, the modal on Casa Panel's
  surface `rgb(22, 23, 21)` with a 24 px radius and in Geist **[measured]**.
- **Fonts.** An `@font-face` inside a shadow root is ignored, but one in the
  document is visible to every shadow tree. The element therefore puts one
  Google Fonts `<link>` in HA's `<head>`. That link is the only thing the
  panel adds to HA's document.

## 4. Remounts

### Confirmed [measured]

- **Navigating away destroys the element**: no `ohomemy-dashboard` exists
  anywhere while on `/history`. **Coming back creates a new one**: an identity
  check against the first element is false.
- **With HA's "suspend when hidden" on** (the default), after 5 minutes hidden
  HA's `partial-panel-resolver` detaches the panel, and the element is gone.
  On becoming visible, `ha-panel-custom` creates a new element **[measured;
  timer read in HA's `app` bundle]**.
- **The naive mount never recovered from either.** After away and back it sat
  on the loader for as long as we watched. After the 5-minute detach it was
  still on the loader once visible, and missed the 321 W change.
- **Cause** **[read]** (`HassConnect/Provider.tsx`): the module-level
  `attemptedUrls` Set gets the URL on the first `connectOnce` and is never
  cleared. The unmount effect calls `useHassProviderStore.reset()`, which
  drops the connection, entities and `ready`. The next mount's `connectOnce`
  returns early because it sees the URL.

### Workaround that held [measured]

`src/panel/tree.ts` builds the DOM once per page: a `styles` node, the React
root's container, and the `portalRoot`. `src/panel/main.tsx` renders `<App>`
into it once and never unmounts it. Each `connectedCallback` moves the tree
into that element's shadow root, and `disconnectedCallback` does nothing. HA's
`panel`, `route` and `narrow` go into a small store (`panelProps.ts`), which
the tree subscribes to.

- **Away and back:** the new element showed the full Dashboard with no loader,
  and with the same 108 style tags.
- **After the 5-minute detach:** the new element showed the Dashboard, and
  showed 321 W four seconds after the change.

**A decision the ADR did not settle.** The ADR says one React root per
Dashboard. Built that way, two Dashboards would get two HassConnects, and
@hakit's stores are module-level singletons (`useInternalStore`,
`useHassProviderStore`). Two providers would share one store and reset it
under each other. So this build keeps **one React root per page**, and which
Dashboard it shows comes from `panel.config` through `panelProps`. HA shows
one panel at a time, so the one tree simply moves to whichever element is
current.

## 5. Suspend on hide

### Confirmed, and worse than read [measured]

Four tabs were hidden for 330 s at once, one for each combination of build and
HA setting:

| Build | HA "suspend when hidden" | What happened to HA's socket |
|---|---|---|
| naive (@hakit default) | **off** | **Closed at 5 min**, reopened only when visible |
| panel build (`suspendWhenHidden: false`) | off | Stayed open throughout |
| panel build | on | Closed at 5 min by HA, reopened when visible, as HA intends |
| naive | on | Closed at 5 min, then **reopened at once while still hidden** |

- **Row 1 is the wall tablet's case.** ADR-0015 turns HA's "suspend when
  hidden" off on the tablet so that it keeps receiving, which Popups depend
  on. @hakit closes the socket anyway. It is HA's own socket, so all of HA's
  frontend goes offline with it, not only the Dashboard.
- **Row 4** **[read]**: both handlers call `suspendReconnectUntil`, and
  @hakit's promise replaces HA's. When HA then detached the panel, the naive
  mount's unmount ran @hakit's cleanup, which resolves its pending promise and
  so lifted the suspension of HA's socket. The socket came back while the page
  was still hidden.

### Workaround that held, and what it leaves

`App` passes `handleResumeOptions: { suspendWhenHidden: false }` when it runs
as a panel, from a module-level constant because the provider's connect
callback depends on it. That is row 2: HA alone decides.

**What it leaves** **[measured, freeze simulated]**: `handleSuspendResume`
also listens for `freeze`, and that handler ignores `suspendWhenHidden`. It
calls `window.stop()` and `connection.suspend()`. With the page hidden and HA
set to off, a dispatched `freeze` closed HA's socket at once. It reopened when
the page became visible, because HA had already set its own
`suspendReconnectUntil` on hide. Without a pending promise, `suspend()` throws
"Suspend promise not set" after `window.stop()` has already run **[read]**.
Chrome fires `freeze` just before it freezes a background tab, and a frozen
page cannot use its socket anyway, so the panel and HA recover on their own.
`window.stop()` still aborts anything loading at that moment, such as camera
feeds. Not worked around: it is in the upstream draft (§8).

## 6. What was not covered

- **A real hidden tab and a real `freeze`.** Both were simulated (§2). Whether
  Fully Kiosk's Android WebView fires `freeze` with the screen off, and when,
  is untested. There is no device here.
- **Narrow (phone) mode.** HA gives a custom panel no toolbar, so on a narrow
  screen nothing opens HA's sidebar unless the Dashboard renders a menu
  button. That is for the Navbar work (#54) and #49.
- **Small leaks that remain.** @hakit's ThemeProvider adds `bp-*` breakpoint
  classes to HA's `<body>`. It styles nothing there.
- **Bundle.** `ohomemy-dashboard.js` is 492 kB (124 kB gzip). It loads
  @hakit's 937 kB chunk (296 kB gzip), and one of ~60 locale chunks of about
  300 kB each, on demand. Nothing was done about size.

## 7. What later issues build on

Committed with this note:

- `ha-dashboard/vite.panel.config.ts` and `npm run build:panel` build
  `dist-panel/ohomemy-dashboard.js` (ES module plus chunks, which load
  relative to it). The build uses `--mode panel`, so the dev token in
  `.env.development` is never compiled in. A grep of the bundle confirmed
  this.
- `src/panel/main.tsx` is the `<ohomemy-dashboard>` element (shadow root, the
  single root, fonts, `index.css` inlined).
- `src/panel/tree.ts`, `emotionCache.ts`, `hostSelectors.ts` (+ test) and
  `panelProps.ts` (+ test).
- `App` takes `panel={{ portalRoot }}`: HA's origin, no token, `portalRoot`,
  and suspend handling off.
- `usePortalRoot()` in `src/ha`, used by `ConcernList` and `SelectTile`.

How the spike registered the panel, for #47/#49 (inside `async_setup_entry`):

```python
await hass.http.async_register_static_paths(
    [StaticPathConfig("/ohomemy_static", str(FRONTEND_DIR), cache_headers=False)]
)
await panel_custom.async_register_panel(
    hass,
    frontend_url_path="ohomemy-<slug>",
    webcomponent_name="ohomemy-dashboard",
    module_url=f"/ohomemy_static/ohomemy-dashboard.js?v={version}",
    sidebar_title=..., sidebar_icon=...,
    require_admin=False,
    embed_iframe=False,
    config={"dashboard_id": ...},
)
# and in async_unload_entry: frontend.async_remove_panel(hass, "ohomemy-<slug>")
```

- A static path cannot be unregistered, so a reload must not register it
  twice.
- The integration needs `"dependencies": ["http", "frontend",
  "panel_custom"]`.

## 8. Draft upstream issue (not filed)

For [shannonhochkins/ha-component-kit](https://github.com/shannonhochkins/ha-component-kit/issues):

> **HassConnect never connects again after it is unmounted and remounted**
>
> **Version:** `@hakit/core` 6.0.2
>
> **What happens.** If `HassConnect` unmounts and a new one mounts with the
> same `hassUrl` in the same page, the new one shows the loader forever.
> Nothing is logged, and no connection attempt is made.
>
> **Where it bites.** Any app that renders `HassConnect` conditionally, a
> keyed remount, or, our case, a dashboard served as a Home Assistant custom
> panel (`embed_iframe: false`). HA destroys the panel element on navigating
> away and creates a new one on coming back, and it does the same after 5
> minutes hidden. Each new element mounts a fresh React tree.
>
> **Minimal reproduction:**
>
> ```tsx
> function Repro() {
>   const [on, setOn] = useState(true);
>   return (
>     <>
>       <button onClick={() => setOn(o => !o)}>toggle</button>
>       {on && (
>         <HassConnect hassUrl={url} hassToken={token}>
>           <Count />
>         </HassConnect>
>       )}
>     </>
>   );
> }
> const Count = () => <p>{Object.keys(useHass(s => s.entities)).length} entities</p>;
> ```
>
> Toggle off, then on. The second mount never leaves the loader.
>
> **Cause** (`packages/core/src/HassConnect/Provider.tsx`):
>
> - The module-level `attemptedUrls` Set gets `hassUrl` on the first
>   `connectOnce()` and is never cleared.
> - On unmount, `useEffect(() => () => useHassProviderStore.getState().reset(), [])`
>   resets the store (connection, entities, `ready: false`) and unsubscribes
>   everything.
> - On the next mount, `connectOnce()` sees the URL in `attemptedUrls` and
>   returns, so nothing ever sets `ready` again.
>
> **Suggested fix.** Forget the attempt when the state it guarded is reset:
> delete `hassUrl` from `attemptedUrls` in the unmount cleanup, or inside
> `reset()`. Alternatively, key the guard on the provider store, which
> `reset()` already clears (`authenticated`), instead of a module-level Set.
> To stay Strict Mode safe, keep the in-flight connection promise per URL and
> reuse it, rather than skipping the call.
>
> **Related, in `handleSuspendResume`** (happy to split this into its own
> issue):
>
> - The `freeze` listener calls `window.stop()` and `connection.suspend()`
>   even with `suspendWhenHidden: false`.
> - When the connection is inherited from Home Assistant
>   (`window.hassConnection`), the socket belongs to HA's frontend, which runs
>   its own suspend logic. @hakit's `suspendReconnectUntil` replaces HA's
>   promise. The cleanup then resolves @hakit's promise, which lifts HA's
>   suspension while the page is still hidden.
> - Suggestion: honour `suspendWhenHidden` in the `freeze` handler too, and
>   skip suspend handling altogether on the `inherited-auth` path.
>
> Workaround until then: keep one React root alive for the page and never
> unmount it.

## Sources

- `@hakit/core` 6.0.2 in `ha-dashboard/node_modules`, original sources from
  its source maps:
  - `HassConnect/Provider.tsx` (`attemptedUrls`, `connectOnce`, the unmount
    `reset()`), `HassConnect/HassContext.tsx` (`reset`, `portalRoot`),
    `HassConnect/tryConnection.ts` (`inherited-auth`).
  - `dist/es/HassConnect/handleSuspendResume.js`.
- `@hakit/components` 6.0.2: `src/ThemeProvider/index.tsx`, from
  `dist/ThemeControlsModal-BRo8GSss.js.map` (its own `CacheProvider` on
  `document.head`, the `:root` globals, the `bp-*` body classes), and
  `dist/emotion-react-jsx-runtime.browser.esm-BErL7L7Y.js` (the bundled
  emotion context).
- `home-assistant-js-websocket` 9.7.0, `dist/connection.js` (`suspend`,
  `suspendReconnectUntil`, reconnect after suspend).
- Home Assistant frontend as shipped in 2026.9.2 (`hass_frontend/
  frontend_latest/app.*.js` in the container):
  - `_onHidden`/`_suspendApp`: `suspendReconnectUntil` on hide, and
    `window.stop()` plus `suspend()` after 3e5 ms unless `suspendWhenHidden`
    is false.
  - `partial-panel-resolver`'s `_onHidden`, which detaches non-iframe panels
    after 3e5 ms.
  - Per-browser settings in `localStorage` (`suspendWhenHidden`).
- `@emotion/cache` 11.14.0 (`createCache` options: `container`, `speedy`,
  `stylisPlugins`, where the default is `[prefixer]`).
- [Creating custom panels](https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels)
  (the `hass`, `narrow`, `route` and `panel` properties).
- Measurements: Playwright runs against `ha-local` on 2026-10-06, described in
  §2.
