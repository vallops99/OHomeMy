# Reaching the dashboard remotely through Nabu Casa

Research question: *"My real Home Assistant is reachable remotely through Nabu
Casa (Home Assistant Cloud remote UI). If I build this project and put `dist`
into `/config/www/ha-dashboard`, can I use the dashboard remotely?"*

- **Date:** 2026-09-24
- **Versions checked:** Home Assistant core **2026.9.2** (tag `33c3e0c`, source
  read in the `ha-local` container under `/usr/src/homeassistant/homeassistant/`,
  and exercised with `curl` against `http://localhost:8123`), home-assistant/frontend
  `dev` @ `f4bb4e2`, `home-assistant-js-websocket` **9.7.0** (tag `3f0edb8`),
  `@hakit/core` **6.0.2** (from `ha-dashboard/node_modules`), ha-component-kit
  `master` @ `df12c20`, NabuCasa/support `main` @ `07b8dee` (the Markdown source
  of support.nabucasa.com).
- **Marking:** **[verified]** means read in source or first-party docs, or
  observed against `ha-local`. **[estimate]** means inferred from verified code
  but not run. **[unverified]** means plausible, not established.

---

## 1. Answer

**Yes, if you change one line first.** Nabu Casa forwards every path to your
instance, and `/local/ha-dashboard/index.html` is served there like it is on the
LAN. The asset paths in the build are already correct. What breaks is the
connection URL: the build bakes in `VITE_HA_URL=http://localhost:8123/`, so the
page tries to log in at `localhost` on whatever device opened it (your phone),
not at your Home Assistant. Make `hassUrl` the page's own origin and the same
`dist` works from the LAN URL, from `https://<id>.ui.nabu.casa`, and inside Home
Assistant's own UI.

Better: after the fix, add the dashboard as a **Webpage dashboard** in HA
pointing at `/local/ha-dashboard/index.html`. Then it sits in the HA sidebar and
in the Companion app, reuses HA's login (no second login), and works both on the
LAN and through Nabu Casa.

Two caveats matter:

- **`/local/` is public.** Anyone who knows the URL can download the bundle
  without logging in. Today's production build contains **no token**
  (`hassToken:void 0` in `dist/assets/index-*.js`), so the files are harmless.
  Never build with a token in `.env`.
- **Updates are cached hard.** HA serves `/local/` with a 31-day
  `Cache-Control`, and HA's service worker serves `/local/` stale-while-revalidate.
  After a deploy, `index.html` can stay old. Bump a `?v=` on the URL each deploy.

## 2. What to change in this repo

1. **`ha-dashboard/src/App.tsx:8`: connect to the page's own origin in a build.**
   ```tsx
   hassUrl={import.meta.env.DEV ? import.meta.env.VITE_HA_URL : window.location.origin}
   ```
   In `npm run dev` the page is served by Vite on `:5199`, so it still needs
   `VITE_HA_URL`. In a build the page is always served by HA itself, so its
   origin *is* the HA URL, whichever one you used: `http://<lan-ip>:8123`,
   `http://homeassistant.local:8123` or `https://<id>.ui.nabu.casa`. Keep
   `VITE_HA_URL` in `ha-dashboard/.env:3`, because `scripts/sync-types.ts` and
   `scripts/deploy.ts:168` use it.
2. **`ha-dashboard/src/App.tsx:9` (`hassToken`): leave it undefined in builds.**
   It already is. `.env` holds no token. The tokens are in `.env.development`
   and `.env.chri.development`, which Vite reads only in those modes. Don't move
   a token into `.env`, and don't build with `--mode chri.development`. The
   ha-component-kit README (`ha-dashboard/README.md`, "HA TOKEN") describes
   moving it into `.env`, and that exact step would publish an **admin** token to
   the internet (§3.1).
3. **Deploy:** copy `dist/` to `/config/www/ha-dashboard/`. `npm run deploy`
   (`scripts/deploy.ts`) does this over SSH. If `/config/www` did not exist
   before, restart HA once (§3.1).
4. **Open it** as `…/local/ha-dashboard/index.html`. The directory URL
   `…/local/ha-dashboard/` returns **403**, because there is no directory index
   (§3.1).
5. **Recommended:** Settings → Dashboards → Add dashboard → **Webpage**, URL
   `/local/ha-dashboard/index.html?v=1`. Use a **relative** URL, so it follows
   whichever origin HA was opened on (§3.5). Change the `v` on each deploy
   (§3.4).
6. Cosmetic: `ha-dashboard/index.html:5` links `/favicon.svg`, which HA
   answers with 404. Either drop the tag or put the file in `public/`, which
   Vite then emits under `base`.

Nothing else in `src/` names a host. Camera Feeds use HA's `get_client_config`
ICE servers (`ha-dashboard/src/ha/feed.ts:138`, `src/ha/useFeed.ts:129`), which
is what remote WebRTC needs (§3.6).

## 3. Details

### 3.1 `/config/www` is `/local/`, unauthenticated, no directory index

- HA docs: *"The static files in `www/` can be accessed by the following URL
  `http://your.domain:8123/local/`"* and *"Files served from the `www` folder
  (`/local/` URL), aren't protected by the Home Assistant authentication. Files
  stored in this folder, if the URL is known, can be accessed by anybody without
  authentication."* It also says a newly created `www/` needs a restart.
  ([HTTP integration, "Hosting files"](https://www.home-assistant.io/integrations/http/))
  **[verified]**
- Source: the frontend registers `/local` as a static path only if `www` exists
  when HA starts
  ([`components/frontend/__init__.py#L556-L558`](https://github.com/home-assistant/core/blob/2026.9.2/homeassistant/components/frontend/__init__.py#L556-L558)).
  Static resources aren't `HomeAssistantView`s. The only `401` gate is
  `if view.requires_auth and not authenticated`, which applies to views
  ([`helpers/http.py#L62`](https://github.com/home-assistant/core/blob/2026.9.2/homeassistant/helpers/http.py#L62)).
  **[verified]**
- Observed on `ha-local`: `GET /local/ha-dashboard/index.html` with no
  credentials returns `200`. `GET /local/ha-dashboard/` and `/local/` return
  `403`. **[verified]**
- **Security.** The bundle is public, but it is only UI code plus entity ids.
  Every entity state still comes over the authenticated websocket. The one real
  risk is a baked-in token. `.env` has none, and the current `dist` bundle
  contains `hassToken:void 0` and no `eyJ…` string **[verified]**. The
  ha-component-kit deploy guide warns about exactly this: *"The Home Assistant
  `www` directory is not protected by authentication … potentially exposing
  both your dashboard and the HA Token"*
  ([ha-component-kit `stories/3.deployment.mdx`](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/stories/3.deployment.mdx)).
  **[verified]**

### 3.2 Nabu Casa forwards every path

- Remote access is a TCP-level proxy routed by SNI. The local instance
  *"demultiplex[es] the packets … decrypt[s] the packets using the SSL
  certificate … forward[s] the decrypted data to the HTTP component"*. The whole
  HTTP server is exposed, not a list of paths
  ([Remote access – Deep dive](https://support.nabucasa.com/hc/en-us/articles/25619268678557),
  source [`remote-access-deep-dive.md`](https://github.com/NabuCasa/support/blob/07b8dee35ab47fb490b64fac007b9c5a354941d3/src/cloud/remote-access/remote-access-deep-dive.md)).
  **[verified]**
- The documented limitations are about IP banning and one more thing: *"Trusted
  network authentication is not available over remote access. Remote visitors
  always get the login screen"*
  ([Remote access – Limitations](https://support.nabucasa.com/hc/en-us/articles/26523862491165),
  [source](https://github.com/NabuCasa/support/blob/07b8dee35ab47fb490b64fac007b9c5a354941d3/src/cloud/remote-access/remote-access-limitations.md)).
  Neither mentions static files. **[verified]**
- ha-component-kit documents this exact deployment:
  `https://YOUR_NABU_CASA_ID.ui.nabu.casa/local/ha-dashboard/index.html`
  ([`stories/3.deployment.mdx`](https://github.com/shannonhochkins/ha-component-kit/blob/df12c20dba61ca68ab462fd3ec0918db16dc8a8f/stories/3.deployment.mdx)).
  **[verified]**
- Asset URLs are fine. `vite.config.ts` sets `base: /local/${VITE_FOLDER_NAME}/`,
  and the built `index.html` references `/local/ha-dashboard/assets/index-*.js`.
  These are root-relative, so they resolve against whichever origin served the
  page. **[verified]**

### 3.3 Login: why `hassUrl` must be the page's origin

The chain with no token (`hassToken` undefined), in `@hakit/core` 6.0.2:

1. `HassConnect` reduces `hassUrl` to `new URL(hassUrl).origin`
   (`dist/index-BDZyTvOW.js`, around line 1555). **[verified]**
2. `tryConnection` picks a mode in this order: an OAuth callback in the URL
   (`auth_callback=1`), an **inherited** connection (`window.top.hassConnection`),
   a provided token, saved tokens (`localStorage["hassTokens"]` whose `hassUrl`
   matches), and last a user request, which redirects to login
   (`dist/es/HassConnect/tryConnection.js`, function `g`). **[verified]**
3. The login goes through `home-assistant-js-websocket`'s `getAuth`. It sends the
   browser to `${hassUrl}/auth/authorize` with `client_id = ${location.protocol}//${location.host}/`
   and `redirect_uri` = the current URL
   ([`lib/auth.ts#L54-L65`](https://github.com/home-assistant/home-assistant-js-websocket/blob/3f0edb88fdac18efb8405cebf129cddc039d47b6/lib/auth.ts#L54-L65),
   `getAuth` at [#L240](https://github.com/home-assistant/home-assistant-js-websocket/blob/3f0edb88fdac18efb8405cebf129cddc039d47b6/lib/auth.ts#L240)).
   **[verified]**
4. HA accepts the redirect only if `client_id` and `redirect_uri` have the same
   scheme and host
   ([`components/auth/indieauth.py#L23-L44`](https://github.com/home-assistant/core/blob/2026.9.2/homeassistant/components/auth/indieauth.py#L23-L44)).
   Because the page is served by HA, both are the page's origin, so this passes
   on the LAN URL and on the nabu.casa URL. **[verified]**

With the current build, `hassUrl` = `http://localhost:8123`. Opened from a phone
through Nabu Casa, step 3 sends the phone to `http://localhost:8123/auth/authorize`,
which is the phone itself, so the login fails. The same happens on the wall
tablet on the LAN. The only machine where it works is one running HA on
`localhost` **[estimate from the code path]**. Setting `hassUrl` to an explicit LAN
URL doesn't help either. From `https://…nabu.casa`, `home-assistant-js-websocket`
throws `ERR_INVALID_HTTPS_TO_HTTP` for any `http:` hassUrl other than
`localhost`
([`lib/auth.ts#L105-L119`](https://github.com/home-assistant/home-assistant-js-websocket/blob/3f0edb88fdac18efb8405cebf129cddc039d47b6/lib/auth.ts#L105-L119)),
and the browser would block `ws://` as mixed content anyway. Also, the LAN IP
isn't reachable from outside. The page's own origin is the only value that works
everywhere. **[verified]**

**Token storage is per origin.** @hakit saves tokens in `localStorage["hassTokens"]`
together with their `hassUrl` (`dist/es/HassConnect/token-storage.js`).
`localStorage` is per origin, so the LAN URL and the nabu.casa URL each log in
once per browser and keep separate refresh tokens. That is expected. **[verified]**

**Same key as HA's own frontend.** HA's frontend also uses
`localStorage["hassTokens"]` in the same format, and writes it only when "Keep
me logged in" is ticked
([`src/common/auth/token_storage.ts#L36-L44`](https://github.com/home-assistant/frontend/blob/f4bb4e242d633156db4ca441e2bb7ea72d3f8054/src/common/auth/token_storage.ts#L36-L44)).
Its `hassUrl` is `${protocol}//${host}`, with no trailing slash. That equals
@hakit's `origin`, so on the same origin the two share one login in both
directions **[estimate from the code; not run]**. The side effect: @hakit's
Logout (`clearTokens`) also logs that browser out of the HA UI.

**User rights.** The panel's websocket calls (`config/label_registry/list`,
camera WebRTC, `call_service`) don't need admin. `config/label_registry/list`
has no `@require_admin`
([`components/config/label_registry.py#L53-L59`](https://github.com/home-assistant/core/blob/2026.9.2/homeassistant/components/config/label_registry.py#L53-L59)).
ADR-0009 already moved Popups off custom events for this reason. A non-admin
household login therefore works **[verified for the commands grepped in `src/`]**.

### 3.4 Caching: `index.html` can go stale after a deploy

- HA serves `/local` with `CachingStaticResource`, which sets
  `Cache-Control: public, max-age=2678400` (31 days) on **every** file,
  `index.html` included, unless HA runs a dev frontend
  ([`components/http/static.py#L13-L15,L46`](https://github.com/home-assistant/core/blob/2026.9.2/homeassistant/components/http/static.py#L13-L46),
  `not is_dev` in `frontend/__init__.py#L558`). Observed on `ha-local`:
  `index.html` → `Cache-Control: public, max-age=2678400`, plus `ETag` and
  `Last-Modified`. **[verified]**
- HA's service worker (registered on `https:` or `localhost`, so it is active
  on the nabu.casa origin) routes every other same-origin path, *"including …
  user files from `/local`"*, through `StaleWhileRevalidate` with a 1-day expiry
  ([`src/entrypoints/service-worker.ts#L169-L183`](https://github.com/home-assistant/frontend/blob/f4bb4e242d633156db4ca441e2bb7ea72d3f8054/src/entrypoints/service-worker.ts#L169-L183),
  [`src/util/register-service-worker.ts#L6-L8`](https://github.com/home-assistant/frontend/blob/f4bb4e242d633156db4ca441e2bb7ea72d3f8054/src/util/register-service-worker.ts#L6-L8)).
  **[verified]**
- Result: the hashed `assets/index-<hash>.js` files are safe. `index.html` is
  the problem. The browser may keep the old one for up to 31 days, and the old
  one points at the old hashes (which `deploy.ts` may have deleted).
  **[estimate]**
- Fix: load `index.html?v=<n>` and bump `n` per deploy (for example in the
  Webpage dashboard URL). The generic service-worker route doesn't ignore the
  query string, and the HTTP cache keys on the full URL. **[estimate]** A hard
  reload on one device also works, but a wall tablet in Fully Kiosk needs the
  `?v=` or a cache clear.

### 3.5 Better: a Webpage dashboard (the old `panel_iframe`)

- *"The webpage dashboard allows you to add and embed a webpage to your
  dashboard"*. It replaced `iframe_panel` / `panel_iframe`, which is migrated
  automatically
  ([Dashboards – Webpage dashboard](https://www.home-assistant.io/dashboards/dashboards/)).
  The Webpage card says files in `www` can be embedded as `/local/<file>`, and
  *"You can't embed sites using HTTP if you are using HTTPS for your Home
  Assistant"* ([Webpage card](https://www.home-assistant.io/dashboards/iframe/)).
  **[verified]**
- The panel also rejects `http:` URLs when HA is on `https:`
  ([`src/panels/iframe/ha-panel-iframe.ts`](https://github.com/home-assistant/frontend/blob/f4bb4e242d633156db4ca441e2bb7ea72d3f8054/src/panels/iframe/ha-panel-iframe.ts),
  the `location.protocol === "https:"` check). So an absolute
  `http://192.168.x.x:8123/local/…` URL fails on nabu.casa, and a **relative**
  `/local/ha-dashboard/index.html` works on both origins. **[verified]**
- HA sends `X-Frame-Options: SAMEORIGIN` by default
  ([`components/http/headers.py#L30-L31`](https://github.com/home-assistant/core/blob/2026.9.2/homeassistant/components/http/headers.py#L30-L31);
  seen on `/local/` responses from `ha-local`). The dashboard can therefore be
  framed only by HA's own origin, and the relative URL satisfies that.
  **[verified]**
- **No second login.** The iframe sandbox includes `allow-same-origin
  allow-scripts`
  ([`src/util/iframe.ts`](https://github.com/home-assistant/frontend/blob/f4bb4e242d633156db4ca441e2bb7ea72d3f8054/src/util/iframe.ts)).
  HA's frontend publishes its connection as `window.hassConnection`
  ([`src/entrypoints/core.ts#L113`](https://github.com/home-assistant/frontend/blob/f4bb4e242d633156db4ca441e2bb7ea72d3f8054/src/entrypoints/core.ts#L113)),
  and @hakit's first check after the OAuth callback is `window.top?.hassConnection`
  ("inherited-auth"). Inside HA, the dashboard reuses HA's authenticated
  websocket, including in the Companion app, where HA authenticates through the
  app (external auth) rather than `localStorage`. **[verified in source; not run]**
- Open point **[unverified]**: with an inherited connection, @hakit's
  suspend-when-hidden handling (`handleSuspendResume`, 5 min hidden) runs on
  **HA's** connection, not a private one. Watch for the HA UI reconnecting after
  the dashboard tab was hidden.
- `panel_custom` (a web component loaded into HA's frontend) is the other
  documented way to add a sidebar entry, but it would mean wrapping the React
  app in a custom element. It isn't needed for remote access.

### 3.6 Cameras: WebRTC Feeds away from home

- Nabu Casa: *"sometimes a direct connection between the client … and the
  camera is not possible. In these situations, the camera stream needs to be
  relayed by an external server. Your Home Assistant Cloud subscription provides
  this relay server (TURN server)"*. It is on by default under Settings → Home
  Assistant Cloud → **WebRTC connections**. Without Cloud there are only the Open
  Home Foundation STUN servers
  ([Improved camera streaming with WebRTC](https://support.nabucasa.com/hc/en-us/articles/25619464018461),
  [source](https://github.com/NabuCasa/support/blob/07b8dee35ab47fb490b64fac007b9c5a354941d3/src/cloud/other-features/webrtc.md)).
  **[verified]**
- The cloud integration registers its TURN servers with `web_rtc.async_register_ice_servers`
  ([`components/cloud/client.py#L213-L219`](https://github.com/home-assistant/core/blob/2026.9.2/homeassistant/components/cloud/client.py#L213-L219)).
  They reach the browser through `camera/webrtc/get_client_config`
  ([`components/camera/webrtc.py#L308-L314`](https://github.com/home-assistant/core/blob/2026.9.2/homeassistant/components/camera/webrtc.py#L308-L314)).
  go2rtc receives the same ICE servers with each offer
  ([`components/go2rtc/__init__.py#L343-L344`](https://github.com/home-assistant/core/blob/2026.9.2/homeassistant/components/go2rtc/__init__.py#L343-L344)).
  **[verified]**
- This repo's Feed calls `get_client_config` and passes its `configuration`
  straight to `RTCPeerConnection` (`ha-dashboard/src/ha/feed.ts:138`,
  `ha-dashboard/src/ha/useFeed.ts:129`), so it picks up the Cloud TURN relay
  with no change. That matches HA's own player. **[verified]** For EZVIZ via
  go2rtc, the TURN relay replaces the LAN-only path to port 18555 noted in
  `docs/research/camera-streaming.md` **[estimate]**. Ring's live view negotiates
  with Ring's cloud, which is reachable from anywhere **[estimate]**.
- The signalling itself goes over the websocket through the same nabu.casa
  tunnel, which needs nothing special. **[verified by §3.2]**

### 3.7 Other gotchas

- **Mixed content** is avoided by the page-origin `hassUrl`: `https://…nabu.casa`
  gets `wss://…nabu.casa/api/websocket` (`ws${hassUrl.substr(4)}`). **[verified]**
- **Trusted networks** don't apply over Nabu Casa (§3.2). If the wall tablet
  relies on them on the LAN, a remote browser still sees the login screen. That's
  fine for a phone.
- **Your real HA version** wasn't checked. The behaviour above is HA 2026.9.2 /
  frontend `dev`. `/local`, its caching and the auth flow are long-standing, but
  confirm the `Cache-Control` header on the real instance with `curl -I`.

## Sources

- Home Assistant docs: [HTTP integration](https://www.home-assistant.io/integrations/http/),
  [Dashboards](https://www.home-assistant.io/dashboards/dashboards/),
  [Webpage card](https://www.home-assistant.io/dashboards/iframe/).
- Nabu Casa support (Markdown source, NabuCasa/support @ `07b8dee`):
  `src/cloud/remote-access/{about-remote-access,remote-access-deep-dive,remote-access-limitations}.md`,
  `src/cloud/other-features/webrtc.md`.
- home-assistant/core 2026.9.2: `components/frontend/__init__.py`,
  `components/http/{static,server,headers}.py`, `helpers/http.py`,
  `components/auth/indieauth.py`, `components/cloud/client.py`,
  `components/camera/webrtc.py`, `components/go2rtc/__init__.py`,
  `components/config/label_registry.py`.
- home-assistant/frontend `dev` @ `f4bb4e2`: `src/common/auth/token_storage.ts`,
  `src/entrypoints/{core,service-worker}.ts`, `src/util/{iframe,register-service-worker}.ts`,
  `src/panels/iframe/ha-panel-iframe.ts`, `src/panels/lovelace/cards/hui-iframe-card.ts`.
- home-assistant-js-websocket 9.7.0: `lib/auth.ts`.
- @hakit/core 6.0.2 (`ha-dashboard/node_modules`): `dist/es/HassConnect/{tryConnection,token-storage}.js`,
  `dist/index-BDZyTvOW.js`. ha-component-kit `stories/3.deployment.mdx`.
- Empirical: `curl` against `ha-local` (`/local/ha-dashboard/index.html`, its
  asset, `/local/`, `/favicon.svg`), and a grep of the current `ha-dashboard/dist`
  for a token, 2026-09-24.
