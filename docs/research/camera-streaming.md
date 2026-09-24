# Live camera streaming on a Fully Kiosk wall panel

Research for issue #20, "Live camera streaming on a Fully Kiosk wall panel" (map #19).

- **Date:** 2026-09-23
- **Scope:** how a **Feed** can show a live picture on the panel (Android tablet, Fully Kiosk Browser, 1280x800 CSS px; see `docs/research/tablet-spec-and-wake-mechanism.md` on commit `fe59344`). It covers the transports HA offers, what @hakit 6.0.2 does, EZVIZ and Ring, and what several Feeds at once cost.
- **Sources pinned at:** home-assistant/core `dev` @ `4f0366f`, home-assistant/frontend `dev` @ `e5f1cb0`, home-assistant.io `current` (fetched 2026-09-23), go2rtc `master` README, hls.js `master` API.md. @hakit sources were read from the source maps shipped in `ha-dashboard/node_modules/@hakit/{core,components}` 6.0.2 (`dist/**/*.js.map` `sourcesContent`).
- **Marking:** **[verified]** means read in source or first-party docs. **[estimate]** means derived from verified constants but not measured. **[unverified]** means plausible but not established, so measure it on the device.

---

## 1. Answer in brief

1. **Use WebRTC for every Feed.** HA hands the frontend three transports: WebRTC (native, or through the built-in go2rtc), HLS / LL-HLS (the `stream` integration) and MJPEG (`/api/camera_proxy_stream`). Only WebRTC is live enough for a doorbell Popup (sub-second). HLS lags by seconds, and MJPEG from these two integrations is either a ≤2 fps slideshow (EZVIZ) or not live at all (Ring).
2. **EZVIZ gets WebRTC through go2rtc.** This needs the local RTSP server switched on and the per-camera "verification code" entered. **Ring gets WebRTC only.** Its `live_view` entity has no HLS and no live MJPEG.
3. **Don't wrap @hakit's `CameraStream`/`CameraCard` as the Feed.** It can't play Ring live. It asks HA for HLS first, the request fails for Ring, and it falls back to an MJPEG `<img>` of the *last recording*. It also leaks its player on unmount: hls.js is never destroyed, and the WebRTC offer subscription is never unsubscribed. @hakit's licence forbids patching it (ADR-0002).
4. **Build a small WebRTC Feed of our own behind the seam.** Put the signalling in `src/ha/` and the `<video>` in `src/ui/`. The four websocket commands are public HA API, and HA's own player (`ha-web-rtc-player.ts`, Apache-2.0) is the reference implementation. The @hakit WebRTC player is a port of the same file.
5. **Several Feeds:** use the camera **substream** (`/Streaming/Channels/102`, the EZVIZ default) for grid Feeds. Decode cost scales with total pixels per second. Measure a 2–4 Feed page on the actual tablet before deciding the camera Page's density.

---

## 2. Transports Home Assistant offers a frontend

The camera entity advertises what it supports through `camera/capabilities` → `frontend_stream_types`. The rule, from `Camera.camera_capabilities` in `homeassistant/components/camera/__init__.py` **[verified]**:

```python
if CameraEntityFeature.STREAM in self.supported_features:
    if self._supports_native_async_webrtc:
        frontend_stream_types.add(StreamType.WEB_RTC)      # native WebRTC (e.g. Ring)
    else:
        frontend_stream_types.add(StreamType.HLS)          # has a stream_source
        if self._webrtc_provider:
            frontend_stream_types.add(StreamType.WEB_RTC)  # go2rtc registered
```

A camera with a native WebRTC implementation advertises **only** `web_rtc`. An RTSP camera advertises `hls`, plus `web_rtc` once go2rtc has registered it as a provider.

### 2.1 WebRTC (native, or through go2rtc)

- **Signalling** runs over the HA websocket with `camera/webrtc/get_client_config`, `camera/webrtc/offer` (a subscription that streams back `session`, `answer`, `candidate` and `error` messages) and `camera/webrtc/candidate`. The media then flows peer to peer between the browser and go2rtc (or the Ring cloud) **[verified: `camera/webrtc.py`; frontend `src/components/ha-web-rtc-player.ts`]**.
- **Unsubscribing closes the session.** HA registers `connection.subscriptions[msg["id"]] = partial(camera.close_webrtc_session, session_id)` (`camera/webrtc.py`) **[verified]**. A player that doesn't unsubscribe leaves the HA-side session open.
- **go2rtc ships with HA.** It's a dependency of `default_config` (`default_config/manifest.json`), and HA OS and HA Container set it up automatically since 2024.11 ([go2rtc integration docs](https://www.home-assistant.io/integrations/go2rtc/)) **[verified]**. The HA-managed instance uses API port 11984 and WebRTC port **18555** (same page). The tablet has to reach HA's host on 18555 TCP/UDP. That's fine on a LAN, and an ICE/STUN question only off-LAN.
- **go2rtc accepts a camera** when its `stream_source()` scheme is one go2rtc supports, for example `rtsp` (`go2rtc/__init__.py`, `_update_stream_source`) **[verified]**. It also serves snapshots (`async_get_image` → `get_jpeg_snapshot`), so posters come from the same connection.
- **Latency:** go2rtc's own compatibility table rates WebRTC latency "best", MSE "medium" and HLS "bad" ([go2rtc README, "Codecs madness"](https://github.com/AlexxIT/go2rtc#codecs-madness)) **[verified as the project's claim]**. In practice that means sub-second glass-to-glass on a LAN **[estimate]**.
- **Codecs:** on Android Chrome 136+ (and therefore a current Android System WebView), WebRTC plays H.264 and H.265, with audio PCMU, PCMA or Opus (same table). HA's go2rtc registration adds an `ffmpeg:<id>#audio=opus` producer so audio works over WebRTC (`go2rtc/__init__.py`) **[verified]**.
- **Fully Kiosk** lists "WebRTC support (Android 5+)". It has an **"Autoplay Videos"** setting for HTML5 `<video>`, and states that videos play only in the hardware **"Graphics Acceleration Mode"** ([fully-kiosk.com](https://www.fully-kiosk.com/en/)) **[verified as vendor docs]**. Use muted autoplay (`autoplay muted playsinline`) so no gesture is needed.

### 2.2 HLS / LL-HLS (the `stream` integration)

- `camera/stream` (default `format: "hls"`) calls `camera.async_create_stream()`, which needs a `stream_source()`. If there isn't one, HA answers with the error `"<entity> does not support play stream service"` (`_async_stream_endpoint_url`, `camera/__init__.py`) **[verified]**. HA runs at most one stream worker per camera.
- **Defaults:** LL-HLS on, `segment_duration` 6 s, `part_duration` 1 s ([stream docs](https://www.home-assistant.io/integrations/stream/)). Without LL-HLS, segments target 2 s and playback starts 1.5 target durations before the live edge (`TARGET_SEGMENT_DURATION_NON_LL_HLS = 2.0`, `EXT_X_START_NON_LL_HLS = 1.5`); with LL-HLS it starts 2 parts back (`EXT_X_START_LL_HLS = 2`) (`stream/const.py`, `stream/hls.py`) **[verified]**.
- **LL-HLS needs HTTP/2 in practice.** The docs say it "opens additional browser connections… strongly recommended to use an HTTP/2 proxy", and the frontend falls back to regular HLS without HTTP/2 **[verified]**. @hakit's player enables `lowLatencyMode` only when `performance.getEntriesByType("resource")[0].nextHopProtocol === "h2"` **[verified]**. HA's built-in server on `:8123` is plain HTTP/1.1, so on this panel @hakit would run regular HLS **[estimate: holds unless a proxy is added]**.
- **Latency:** LL-HLS is roughly 2–3 s behind live. Regular HLS is roughly 3–10 s behind, depending on keyframe interval, since hls.js by default sits `liveSyncDurationCount = 3` target durations from the edge when the playlist gives no start offset ([hls.js API.md](https://github.com/video-dev/hls.js/blob/master/docs/API.md)) **[estimate]**. Either is too slow for someone standing at the gate.
- **Codecs:** H.264 and H.265 video, AAC and MP3 audio. **PCM/G.711 audio is not supported** (stream docs) **[verified]**. Many IP cameras send G.711.
- **Needs** `hls.js` installed. It's a peer dependency of `@hakit/components` (`"hls.js": ">=1.x.x"`) and isn't in our `package.json` **[verified]**.

### 2.3 MJPEG (`/api/camera_proxy_stream/<entity>?token=…`)

- By default `handle_async_mjpeg_stream` → `handle_async_still_stream(request, frame_interval)`, which re-fetches `async_camera_image()` every `MIN_STREAM_INTERVAL = 0.5` s. That's **at most 2 fps** unless the integration overrides it (`camera/__init__.py`) **[verified]**.
- **EZVIZ** doesn't override it, and its `async_camera_image` runs `ffmpeg.async_get_image` against RTSP *per frame* (`ezviz/camera.py`) **[verified]**. The result is a slow, CPU-heavy slideshow on the HA host. It doesn't count as a live Feed.
- **Ring** overrides it, but pipes `self._video_url`, which is the **last recording**, through ffmpeg (`ring/camera.py`, `handle_async_mjpeg_stream`) **[verified]**. It isn't live.
- The token rotates every 5 minutes (`TOKEN_CHANGE_INTERVAL`), with the previous one still accepted (`access_tokens` deque of 2) **[verified]**. A long-lived `<img>` keeps working, but a remount must re-read the attribute.

### 2.4 Summary

| Transport | Latency on this panel | EZVIZ | Ring `live_view` | Notes |
|---|---|---|---|---|
| WebRTC | sub-second **[estimate]** | yes, via go2rtc | **yes (only option)**, native through the Ring cloud | Needs port 18555 reachable for go2rtc |
| LL-HLS | ~2–3 s **[estimate]** | yes | no | Needs HTTP/2; no G.711 audio |
| HLS | ~3–10 s **[estimate]** | yes | no | What @hakit does on plain :8123 |
| MJPEG | ≤2 fps (EZVIZ) / not live (Ring) | slideshow | last recording only | Not a Feed |

---

## 3. EZVIZ in Home Assistant

Sources: [EZVIZ integration docs](https://www.home-assistant.io/integrations/ezviz/) and `ezviz/camera.py` / `ezviz/const.py` **[verified]**.

- **Cloud account** for discovery and control (`iot_class: cloud_polling`). **Video is local RTSP** from the camera's LAN IP, so HA must reach it on the LAN.
- **Prerequisites.** In the EZVIZ app, open the camera's settings → *Local Server Settings* → **enable RTSP**. Then finish the per-camera discovered flow with the **verification code** printed near the QR code. The account must have two-step verification **off**, and OAuth logins (Google, Facebook) don't work.
- **`CameraEntityFeature.STREAM` is set only when a camera password was configured** (`if camera_password: self._attr_supported_features = CameraEntityFeature.STREAM`). An unfinished camera therefore advertises no stream types at all, and a frontend would get only snapshots or nothing.
- The stream URL is `rtsp://<user>:<code>@<local_ip>:<local_rtsp_port><ffmpeg_arguments>`. `DEFAULT_FFMPEG_ARGUMENTS = "/Streaming/Channels/102"` is the **substream**; `/Streaming/Channels/101` is the main stream (docs). This is per camera, in the integration's options.
- **Result:** `frontend_stream_types = ["hls", "web_rtc"]` once go2rtc is running. **Use WebRTC.**
- Battery EZVIZ models in power-saving mode sleep, and "active live view can wake up the camera" (docs, *Battery work mode*). Expect a slow first frame on those **[unverified for any specific model]**.
- **Codec caveat:** some EZVIZ models encode H.265. Android WebView plays H.265 over WebRTC only from Chrome 136 on (go2rtc table). If a camera shows black, check the codec. Set it to H.264 in EZVIZ Studio or the app, or use the substream **[unverified per model]**.

## 4. Ring in Home Assistant

Sources: [Ring integration docs](https://www.home-assistant.io/integrations/ring/) and `ring/camera.py` **[verified]**.

- **Cloud only.** "The Ring integration does not connect locally to devices, all communication goes via the cloud."
- **Two camera entities per device:** `live_view` (enabled) and `last_recording` (disabled by default, and needs a Ring Protect plan).
- **`live_view`** has `CameraEntityFeature.STREAM` and implements **native WebRTC** (`async_handle_async_webrtc_offer`, `async_on_webrtc_candidate`, and `close_webrtc_session` → `sync_close_webrtc_stream`). It has **no `stream_source`**, so `frontend_stream_types = ["web_rtc"]` only. There's no HLS, and `camera/stream` fails.
- **Snapshots and MJPEG** on Ring come from the last recording through ffmpeg, and need a subscription (`async_camera_image` raises `no_subscription` without one). A Ring Feed's poster may be stale or missing. The Feed should show its own placeholder until the first WebRTC frame arrives, not rely on a poster.
- Two-way audio is "not currently supported" (docs). The Ring Popup is watch-only, which fits the map's scope.
- **Latency and start-up time** of Ring's cloud WebRTC aren't documented **[unverified]**. Expect a few seconds to the first frame, because a cloud session is negotiated each time, and sub-second-to-low-seconds once playing. Measure it on the real Ring. Starting the session when the Popup opens, not earlier, is enough, because the HA automation opens the Popup on the ring event.
- The `live_view` session keeps the Ring's camera streaming (and a battery Ring awake) for as long as it's open **[estimate]**. The Feed must close the session (unsubscribe) as soon as it unmounts.

---

## 5. What @hakit 6.0.2 actually does

Read from the shipped source maps.

### 5.1 `useCamera` (`@hakit/core`, `src/hooks/useCamera/index.ts`)

- It fetches `camera/capabilities`, a signed poster URL (`auth/sign_path` for `/api/camera_proxy/<id>`, cached for 9 s), and the MJPEG URL.
- **Unless `{stream: false}` is passed, it always calls `camera/stream` (HLS).** For a go2rtc camera, this starts an HLS worker on HA (an extra RTSP pull from the camera) even when the player will use WebRTC. For Ring, the call fails.
- `mjpeg.shouldRenderMJPEG` is `true` **whenever `camera/stream` errored**, before `frontend_stream_types` is even consulted:

  ```ts
  if (streamError) return true;                         // Ring always lands here
  if (!supportsFeature(STREAM)) return true;
  if (capabilities.frontend_stream_types.includes("web_rtc"))
    return typeof RTCPeerConnection === "undefined";
  return false;
  ```

### 5.2 `CameraStream` / `CameraCard` (`@hakit/components`, `src/Cards/CameraCard/**`)

- `CameraStream` renders the MJPEG `<img>` if `shouldRenderMJPEG`, otherwise `WebRTCPlayer` if `web_rtc` is advertised, otherwise `HlsPlayer` if `hls` is advertised. **For Ring it ends up as the MJPEG `<img>` of the last recording** (§5.1 + §4). This is a hard blocker for the Ring Popup.
- `CameraCard` defaults to `view="poster"` (a snapshot refreshed every 10 s). `view="live"` mounts `CameraStream`. It brings its own header, footer and view-switch buttons, and its doc comment says: "the WebRTC implementation hasn't been tested."
- **`HlsPlayer` never destroys its hls.js instance.** Its `useEffect(() => { _startHls(); }, [_startHls])` has no cleanup, so an unmounted Feed can keep loading segments. Navigation here is state (ADR-0006), so opening and closing the camera Page mounts and unmounts Feeds repeatedly.
- **`WebRTCPlayer`'s unmount cleanup closes the `RTCPeerConnection` but never calls the `camera/webrtc/offer` unsubscribe.** It does that only on error paths. HA therefore doesn't run `close_webrtc_session` until the websocket closes (§2.1). For Ring, that plausibly holds the cloud session open **[estimate]**.
- Both players set `started.current = true` once and never reset it. There's no reconnect after a dropped stream beyond `restartIce()`.
- Otherwise the WebRTC signalling is a faithful port of HA's `ha-web-rtc-player.ts` (it cites commit `7d1ca2a`).

### 5.3 Can it be wrapped behind `src/ui/` per ADR-0002?

Mechanically, yes. `CameraStream`, `WebRTCPlayer`, `HlsPlayer` and `useCamera` are all exported, so a `src/ui/Feed.tsx` could wrap them. **It shouldn't**, for three reasons: the Ring blocker is in `useCamera`'s decision logic, the unmount leaks are inside the players, and @hakit's licence forbids modifying it, so none of these can be patched (ADR-0002).

**Recommendation.** Write the Feed ourselves on the same seam:

- `src/ha/`: a `useFeedSession(entityId)` (or similar) that owns the websocket signalling with `camera/capabilities`, `camera/webrtc/get_client_config`, `camera/webrtc/offer` (subscribe), `camera/webrtc/candidate` and **unsubscribe on unmount**. It gets the connection through the existing `useHass` access.
- `src/ui/`: a `Feed` that renders `<video autoplay muted playsinline>` from the `MediaStream`, plus our own placeholder and error states, in our tokens.
- **Reference:** HA frontend's [`src/components/ha-web-rtc-player.ts`](https://github.com/home-assistant/frontend/blob/dev/src/components/ha-web-rtc-player.ts). The frontend repo is Apache-2.0, so adapting it with attribution is allowed. That isn't true of @hakit.
- **WebRTC only, no HLS fallback.** Ring can't use HLS, and EZVIZ via go2rtc doesn't need it. Dropping HLS removes the `hls.js` dependency and the extra HA stream worker. If `frontend_stream_types` lacks `web_rtc` (for example an EZVIZ camera without its verification code), the Feed shows an explicit "no live stream" state rather than degrading to a snapshot. The map says a snapshot doesn't count as a Feed.

This is roughly 150–200 lines. The build ticket should size it, not this one.

---

## 6. Cost of several Feeds at once

### 6.1 On the network and on HA

- **go2rtc fans out.** One RTSP pull per camera is shared by every WebRTC consumer. Each Feed adds one outgoing WebRTC stream from the HA host to the tablet at roughly the camera's bitrate **[verified mechanism: go2rtc registers one stream per camera identifier; bitrate estimate]**.
- **Bitrate is set by the camera stream you pick, not by HA.** Typical 1080p main streams run at a few Mbit/s, and substreams at a few hundred kbit/s **[estimate; varies per model, read it off each camera's settings]**. Four substream Feeds are well under 5 Mbit/s, which is trivial on home Wi-Fi.
- **Ring** Feeds come through the internet (the Ring cloud), so upstream bandwidth and Ring's own session limits apply **[unverified]**. There's only one Ring, shown only in its Popup.
- **Avoid HLS alongside WebRTC** (which is what @hakit's `useCamera` causes). Each HLS request starts an HA stream worker, which is another RTSP pull and remux per camera on the HA host (`async_create_stream`, one per camera) **[verified]**.

### 6.2 On the tablet (decoding)

- WebRTC and `<video>` on Android decode H.264/H.265 through the platform decoders (hardware when available). Fully Kiosk states that video plays only in the hardware "Graphics Acceleration Mode" **[verified vendor claim]**.
- Decode load scales with total pixels per second. Four 1080p30 Feeds are about 250 Mpx/s, the same as one 4K30 stream. Four 640x360 substreams are about 28 Mpx/s, roughly an eighth of one 1080p30 stream **[arithmetic]**. The reference tablet (Galaxy Tab A9+, Snapdragon 695 per Samsung's product listing) is a mid-range SoC. Its concurrent-decoder limit (Android `MediaCodec` instances) isn't published in a primary source **[unverified]**.
- **Displayed size makes a substream enough.** On a 1280x800 CSS px panel at DPR 1.5, a quarter-screen Feed is about 640x400 CSS px, or 960x600 physical px. A 640x360 substream is slightly upscaled, and 101-channel 1080p is wasted decoding.
- **Recommendations:**
  - Grid Feeds (the camera Page) use the substream. A single large Feed (the Ring Popup, or a Feed that fills a Region) can use the main stream.
  - Only mount Feeds that are on screen, and tear them down (unsubscribe, close the peer connection, stop tracks) on navigation. With the screen off (Fully `screen_on` switch), the page stays alive, so a mounted Feed would keep streaming. The panel should drop Feeds when it returns to `page:main` after idling.
  - **Measure before fixing the camera Page's density.** On the real tablet, open 1, 2, 4 Feeds and read `chrome://webrtc-internals`-equivalent stats (`RTCPeerConnection.getStats()`: `framesDecoded`, `framesDropped`, `totalDecodeTime`) and the device temperature over 10 minutes. The browser recipe in memory can't emulate Android decoders.

---

## 7. Open items for the build ticket

1. Confirm go2rtc is loaded on `ha-local` and on the production HA (`default_config` or an explicit `go2rtc:`), and that the tablet reaches port 18555.
2. For each EZVIZ camera: RTSP on, verification code entered, stream path chosen (102 for grids), codec H.264 if the camera offers it.
3. Measure Ring first-frame time and steady latency in HA's own more-info dialog before building. That's the same WebRTC path the Feed will use.
4. Measure 1/2/4 Feeds on the tablet (§6.2).

## Sources

- HA core: [`camera/__init__.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/camera/__init__.py), [`camera/webrtc.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/camera/webrtc.py), [`stream/const.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/stream/const.py), [`stream/hls.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/stream/hls.py), [`go2rtc/__init__.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/go2rtc/__init__.py), [`go2rtc/const.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/go2rtc/const.py), [`ezviz/camera.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/ezviz/camera.py), [`ezviz/const.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/ezviz/const.py), [`ring/camera.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/ring/camera.py), [`default_config/manifest.json`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/default_config/manifest.json)
- HA frontend (Apache-2.0): [`ha-web-rtc-player.ts`](https://github.com/home-assistant/frontend/blob/dev/src/components/ha-web-rtc-player.ts), [`ha-camera-stream.ts`](https://github.com/home-assistant/frontend/blob/dev/src/components/ha-camera-stream.ts)
- HA docs: [Camera](https://www.home-assistant.io/integrations/camera/), [Stream](https://www.home-assistant.io/integrations/stream/), [go2rtc](https://www.home-assistant.io/integrations/go2rtc/), [EZVIZ](https://www.home-assistant.io/integrations/ezviz/), [Ring](https://www.home-assistant.io/integrations/ring/)
- [go2rtc README](https://github.com/AlexxIT/go2rtc) (Codecs, Codecs madness)
- [hls.js API.md](https://github.com/video-dev/hls.js/blob/master/docs/API.md) (`liveSyncDurationCount`, `lowLatencyMode`)
- [Fully Kiosk Browser features](https://www.fully-kiosk.com/en/)
- @hakit 6.0.2 shipped source maps: `@hakit/core/dist/es/hooks/useCamera/*.js.map`, `@hakit/components/dist/ThemeControlsModal-BRo8GSss.js.map` (`src/Cards/CameraCard/**`)
