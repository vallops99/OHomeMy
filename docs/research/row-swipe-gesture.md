# Holding a Row: the swipe gesture mechanism

Research for wayfinder ticket #26 (child of map #19). The question: how a Row
(`ha-dashboard/src/ui/RoomRow.tsx`, on `Tile.tsx` / @hakit `CardBase`) gets a
swipe-right gesture that opens its Area's Page. The gesture has to coexist with
four other things: tap-to-toggle, the nested brightness `Slider`, the vertically
scrolling Panel columns, and Fully Kiosk Browser on a 1280x800 Android tablet.

Already decided, and not reopened here: swipe right opens the Page, the Row
follows the finger over a label underneath, release past about 1/3 of the width
or a flick commits, anything else springs back, a drag that starts inside the
slider is always brightness, and the long-press modal is being removed from Rows.

Versions read: `@use-gesture/core` and `@use-gesture/react` 10.3.1,
`@hakit/components` 6.0.2, `use-long-press` 3.3.0 (all from
`ha-dashboard/node_modules`). The Android and Chromium sources were read at
`main` on 2026-09-24.

Units: on Android WebView one CSS px is one dp, because `devicePixelRatio`
equals the display density. The platform values below, which are given in dp,
therefore carry over to CSS px unchanged.

---

## 1. State of the art: separating swipe, scroll and tap

### 1.1 The browser decides vertical scrolling. Let it.

The standard way to have a horizontal swipe inside a vertical scroller is to
declare the swipe surface `touch-action: pan-y`. That hands vertical panning to
the browser and keeps horizontal movement for script.

- Pointer Events 3 §8.3 gives almost exactly this case as its example: "an image
  carousel may use `pan-y` to ensure it receives pointer events for any
  horizontal pan operations without interfering with vertical panning of the
  document." ([spec §8.3](https://www.w3.org/TR/pointerevents3/#details-of-touch-action-values))
- Pointer Events 3 §8.2 says the value is checked on "each element between the
  hit tested element and its nearest inclusive ancestor that is a scroll
  container". The Row's wrapper sits inside the Panel column, which has
  `overflowY: auto` (`Panel.tsx`), so `pan-y` on the wrapper governs every touch
  that starts on the Row. The slider's own `touch-action: none` (see §3.2) still
  wins inside the slider, because the checks are intersected.
  ([spec §8.2](https://www.w3.org/TR/pointerevents3/#determining-supported-direct-manipulation-behavior))
- The direction is locked for the life of the pointer (§8.2): "if an element has
  been set to `touch-action: pan-y` … and a touch gesture starts off
  horizontally, no vertical panning should occur if the user changes the
  direction of their gesture to be vertical while their finger is still touching
  the screen." The spec builds in the direction lock that native list swipes
  have.
- When the browser does take a gesture for scrolling, it must fire
  `pointercancel`. §8.1 says "Right before starting to pan or zoom, the user
  agent MUST suppress a pointer event stream", and §4.1.3.3 says suppression
  means firing `pointercancel`, `pointerout` and `pointerleave`, then releasing
  capture. So a vertical scroll ends the swipe gesture with a `pointercancel`,
  not a `pointerup`.
  ([spec §4.1.3.3](https://www.w3.org/TR/pointerevents3/#suppressing-a-pointer-event-stream))

**How Chromium decides (and so Android WebView, which runs Fully Kiosk).**
`components/input/touch_action_filter.cc`, `ShouldSuppressScrolling()`, runs on
the `GestureScrollBegin`. It compares `|delta_x_hint|` with `|delta_y_hint|`.
If horizontal is larger, the minimal conforming action is `pan-left`/`pan-right`.
If not, it is `pan-up`/`pan-down`. Under `pan-y`, a gesture whose first scroll
delta is mostly horizontal is therefore never scrolled, and one that is mostly
vertical scrolls and cancels the pointer stream. This is the 45° dominant-axis
rule that Android's own `ItemTouchHelper` uses (`absDx > absDy`, see below).
([source](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/input/touch_action_filter.cc))

`GestureScrollBegin` itself is only produced once the finger has passed the
touch slop (next section). Until then, script sees plain `pointermove`s, and the
browser has not yet committed to either direction.

### 1.2 Touch slop: when movement starts to count

| Value | Source |
|---|---|
| `TOUCH_SLOP = 8` dp: "Distance a touch can wander before we think the user is scrolling". It is a fallback, and devices may override it through `config_viewConfigurationTouchSlop`. | Android [`ViewConfiguration.java`](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/core/java/android/view/ViewConfiguration.java) |
| `PAGING_TOUCH_SLOP = TOUCH_SLOP * 2` (16 dp): slop before a paged horizontal scroll (ViewPager). | same file |
| Chromium on Android: `set_max_touch_move_in_pixels_for_click(ViewConfiguration::GetTouchSlopInDips())`. A touch that moves further than the device touch slop does not produce a click. | [`gesture_configuration_android.cc`](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/ui/events/gesture_detection/gesture_configuration_android.cc) |
| `ItemTouchHelper` (RecyclerView swipe-to-dismiss) ignores movement while `absDx < mSlop && absDy < mSlop`, with `mSlop = vc.getScaledTouchSlop()`, then picks the axis by `absDx > absDy`. | [`ItemTouchHelper.java`](https://android.googlesource.com/platform/frameworks/support/+/refs/heads/androidx-main/recyclerview/recyclerview/src/main/java/androidx/recyclerview/widget/ItemTouchHelper.java) |

**Recommendation:** a 10 px activation threshold for the Row swipe, used as both
the drag threshold and the tap tolerance. It sits just above the 8 dp default
touch slop, so the Row does not start moving before the browser has had its
chance to claim the gesture as a scroll, and a tap that jitters a few px is still
a tap. (The tablet's actual slop could differ if the vendor overrode it; this
could not be checked from here.)

### 1.3 Commit threshold and flick velocity

What the platform does, from `ItemTouchHelper.checkHorizontalSwipe()`:

- **Distance:** `Math.abs(mDx) > mRecyclerView.getWidth() * getSwipeThreshold()`,
  with a default `getSwipeThreshold()` of `.5f` ("the user must move the View at
  least half of RecyclerView's width").
- **Flick:** the velocity from `VelocityTracker`, capped at
  `item_touch_helper_swipe_escape_max_velocity` = **800 dp/s**, must be at least
  `item_touch_helper_swipe_escape_velocity` = **120 dp/s**. It must also point
  the same way as the displacement, and `absXVelocity > Math.abs(yVelocity)`.
  ([dimens.xml](https://android.googlesource.com/platform/frameworks/support/+/refs/heads/androidx-main/recyclerview/recyclerview/src/main/res/values/dimens.xml))
- For comparison, a general fling in Android needs `MINIMUM_FLING_VELOCITY = 50`
  dp/s (`ViewConfiguration.java`).

What @use-gesture does by default (`swipe` option, see §2): velocity
**0.5 px/ms** (= 500 dp/s), distance **50 px**, and the *whole gesture* must
finish in under **250 ms** (`if (state.elapsedTime < sdt)` in `pointerUp`).

**Recommendation:**

- **Distance commit:** movement ≥ **1/3 of the Row's width**, as already
  decided. That is more permissive than Android's 1/2, which suits a navigation
  shortcut on a wide (~600 px) Row. At 1/2 the finger would have to travel
  roughly 300 px.
- **Flick commit:** at release, rightward x-velocity ≥ **0.5 px/ms** *and*
  movement ≥ **50 px**, whatever the duration. Those are @use-gesture's own
  defaults for velocity and distance, and they are stricter than
  `ItemTouchHelper`'s 120 dp/s. Stricter is right here, because a false positive
  navigates away and a false negative only springs back. Do **not** rely on
  @use-gesture's `swipe[0]`: its 250 ms total-duration cap rejects the usual
  "drag, then flick" motion (see §2.4).

### 1.4 Cancelling the click after a swipe

- Pointer Events 3 §11: "Calling `preventDefault` during a pointer event MUST
  NOT have an effect on whether `click` … [is] fired or not." Preventing
  pointer events will not stop the click.
  ([spec §11](https://www.w3.org/TR/pointerevents3/#compatibility-mapping-with-mouse-events))
- The same section allows user agents to skip `click` on their own when a touch
  "includes too much movement". Chromium on Android does exactly that beyond the
  touch slop (§1.2). **But that behaviour is a heuristic, and the spec says it
  may differ between implementations.** So it cannot be relied on.
- The robust pattern is a **capture-phase click listener on the swipe surface**.
  When the last gesture was not a tap, it calls `preventDefault()` and
  `stopPropagation()`. Registering in the capture phase on the ancestor means
  the click never reaches the descendant's own `onClick`, which here is
  `CardBase`'s toggle. @use-gesture's `filterTaps` does exactly this (§2.3).

---

## 2. Expressing it with @use-gesture 10.3.1

### 2.1 Dependency status

- `ha-dashboard/package.json` does **not** list `@use-gesture/react`. It is in
  the tree because `@hakit/components` 6.0.2 declares it as a **peer dependency**
  (`"@use-gesture/react": ">=10.x"`), and npm ≥ 7 installs peers automatically.
  `package-lock.json` marks both `node_modules/@use-gesture/react` and
  `node_modules/@use-gesture/core` with `"peer": true`.
- **What follows:** importing it from `src/` today would work, but only by
  accident of npm's peer auto-install. It would break under
  `--legacy-peer-deps`, pnpm's strict layout, or an @hakit release that drops
  the peer. **Add it as a direct dependency** with
  `npm i @use-gesture/react@^10.3.1`. The range satisfies @hakit's `>=10.x`, so
  npm keeps a single copy, and the Row and the `ControlSlider` then run on the
  same engine. The licence is MIT (lockfile), unlike @hakit.

### 2.2 The options that matter (read from `core/dist/actions-fe213e88.esm.js`)

| Option | Default | Behaviour in source | Use here |
|---|---|---|---|
| `axis: 'x'` | `undefined` | `selectAxis()` picks `'x'` when `absDx > absDy && absDx > axisThreshold`. After that, `_blocked` is true whenever `config.axis !== state.axis`, and `emit()` then **does not call the handler**. The axis is chosen once per gesture (reset in `reset()`). A vertical gesture never reaches the handler. | **Yes.** The docs recommend pairing it with `touch-action: pan-y` ([extras](https://use-gesture.netlify.app/docs/extras/#touch-action)). |
| `axisThreshold` | `{ mouse: 0, touch: 0, pen: 8 }` | Movement needed before the axis is chosen. At `touch: 0` the first 1 px move decides. | `{ touch: 10 }`, to decide at roughly the moment Chromium does (§1.1–1.2). |
| `threshold` | `0`, or `1` with `axis`, or `tapsThreshold` with `filterTaps` | The handler is not "intentional" until `|movement| ≥ threshold`. `movement` is reported **minus** the threshold (`movement[0] = _m0 - _step[0]`), so the Row does not jump when it starts following. | `10`. |
| `filterTaps` | `false` | At `pointerUp`, `tap = distance ≤ tapsThreshold` on both axes. When a gesture is a tap, the handler still fires, once, with `tap: true`. It binds `onClickCapture` (`capture: true, passive: false`) that calls `preventDefault(); stopPropagation()` when `!state.tap && event.detail > 0`. | **Yes**: this is the click-after-swipe cancel from §1.4. |
| `tapsThreshold` | `3` | px tolerance for `tap`. | **`10`**, the same as `threshold`. At the default 3, a tap that jitters 4–8 px is still a click to Chromium, but use-gesture swallows it, and the toggle silently does nothing. |
| `swipe` | `{ velocity: 0.5, distance: 50, duration: 250 }` | `swipe[0]` is set only if `elapsedTime < 250`, and `vx` is the **last segment's** `|delta|/timeDelta`. | Do not use `swipe[0]`. Read `velocity[0]` / `direction[0]` at `last` instead (§2.4). |
| `pointer.capture` | `true` | `pointerDown` calls `event.target.setPointerCapture(pointerId)` and binds move/up/cancel/`lostpointercapture` on the element. | Leave it at the default. Touch pointers are implicitly captured anyway (PE3 §9.4, "SHOULD behave exactly as if `setPointerCapture` was called on the target element"). |
| `preventScroll` | `false` | Starts the drag with `_active = false` and only activates after 250 ms, or when the axis resolves to something other than `preventScrollAxis`. | **Do not use.** It exists for `touch-action: auto` targets. With it, a quick tap (< 250 ms) reaches `pointerUp` with `_active` false, returns before `tap` is computed, and `filterTaps` then **swallows the tap's click**. `touch-action: pan-y` does the same job without that trap. |
| `pointer.touch` | `false` | Uses touch events, "which aren't canceled on scroll". | No. We *want* the cancel. |
| `delay` | `0` | Postpones activation. | No. |

Two source details the handler has to respect:

1. **`pointercancel` arrives as a normal `last`.** `bind()` routes
   `device 'cancel'` and `lostPointerCapture` to the same `pointerUp()`. After a
   browser scroll takes over (§1.1), the handler may receive a final event whose
   `event.type === 'pointercancel'`, with whatever movement had built up. It
   must spring back and never commit on that event.
2. **`velocity` is absolute** (`absoluteDelta / dt`). The sign lives in
   `direction`. On the release event, kinematics are only recomputed if more
   than 32 ms passed since the last move (`BEFORE_LAST_KINEMATICS_DELAY = 32`),
   so the final move's velocity is kept rather than zeroed by a stationary
   `pointerup`.

### 2.3 Shape of the binding

A wrapper `div` that @hakit never sees owns the gesture, and an inner layer
moves:

```tsx
import { useDrag } from '@use-gesture/react';

const bind = useDrag(
  ({ first, last, tap, canceled, movement: [mx], velocity: [vx], direction: [dx],
     event, memo, cancel }) => {
    // Gesture ownership: a drag that began on the slider is brightness, full stop.
    if (first) memo = (event.target as Element).closest('[data-gesture-owner]') !== null;
    if (memo || tap) return memo;

    const x = Math.max(0, mx);               // right only
    if (!last) { setOffset(x); return memo; } // follow the finger (no transition)

    const aborted = canceled || event.type === 'pointercancel';
    const width = rowRef.current!.offsetWidth;
    const commit = !aborted && (x >= width / 3 || (dx > 0 && vx >= 0.5 && x >= 50));
    commit ? navigate() : springBack();       // springBack animates offset -> 0
    return memo;
  },
  {
    axis: 'x',
    axisThreshold: { touch: 10 },
    threshold: 10,
    filterTaps: true,
    tapsThreshold: 10,
    // pointer.capture: true (default), preventScroll: off (default)
  },
);

<div ref={rowRef} {...bind()} style={{ position: 'relative', overflow: 'clip', touchAction: 'pan-y', borderRadius: t.radius.tile }}>
  <div aria-hidden style={{ position: 'absolute', inset: 0 /* the revealed label */ }} />
  <div style={{ transform: `translateX(${offset}px)` /* transition only on spring-back */ }}>
    <Tile row … />
  </div>
</div>
```

Notes:

- `overflow: clip` (or `hidden`) on the wrapper matters. The Panel column is a
  scroll container, and without a clip the translated Row creates horizontal
  overflow in it.
- Put the transform on the inner layer, **not** on `CardBase`. `Tile` passes
  `onlyFunctionality`, and for that case @hakit's base element (`vi(r, true)`)
  is an unstyled element, so no @hakit `transition: transform` fights the
  finger. A dedicated layer is still clearer, and it survives a future @hakit
  restyle.
- Do not call `cancel()` for slider-origin gestures. Let them run and have the
  handler ignore them through `memo`. `cancel()` leaves `state.tap` false, so
  the `filterTaps` click guard would then swallow the slider's own tap-to-set
  click (`ControlSlider` handles `onClick` for tap-to-position).

---

## 3. Coexisting with the Slider and with @hakit CardBase

### 3.1 CardBase, as shipped (`dist/ThemeControlsModal-BRo8GSss.js`, lines ~152–265)

- **Long-press:** `useLongPress(cb, { threshold: 300, cancelOnMovement: true, cancelOutsideElement: true })`,
  spread onto the **card root** as `...L()` (pointer handlers: `use-long-press`
  3.3.0 defaults to `detect: 'pointer'`, and `cancelOnMovement: true` means a
  25 px tolerance). `disableModal` does **not** unbind it. It only stops the
  callback from opening the modal (`!v && P(!0)`). `use-long-press` never calls
  `preventDefault` or `stopPropagation` (checked in `index.mjs`), so an inert
  long-press binding is harmless to the swipe. Passing `disableModal` always is
  enough to "remove" the long-press from Rows.
- **Tap:** `onClick` is bound on the inner `.contents` element (`Cn`), which is
  inside the `Ripples` wrapper. The ripple itself runs on `click` (`To`'s `f`),
  not on pointerdown, and calls `E.stopPropagation()`. Because both the toggle
  and the ripple are click-driven, the wrapper's capture-phase click guard
  (`filterTaps`) suppresses **both** after a swipe. No toggle fires and no
  ripple flashes.
- **Press scaling:** `.card-base-active` is added on `pointerdown` of
  `.contents`. The `scale(0.9)` rule belongs to the styled base, and `Tile`'s
  `onlyFunctionality` path does not use that base, so nothing scales mid-swipe.
- **Rest props:** CardBase spreads unknown props (`...z`) onto the root *after*
  `...L()`. Passing `onPointerDown` etc. through `Tile` would therefore
  **replace** the long-press handlers. That is another reason to bind the swipe
  on our own wrapper, outside CardBase, rather than threading `bind()` through
  it. The wrapper also keeps `Tile.tsx` the only file that touches @hakit.

Nothing in @hakit needs changing, which matters because its licence (`LICENSE.md`,
proprietary, "Any … modification … is strictly prohibited") rules that out.

### 3.2 The Slider: ownership, not propagation

- `ControlSlider` (same file, ~line 6280) is `useGesture({ onDrag, onDragStart, onDragEnd, onClick }, { drag: { filterTaps: true } })`.
  Its host element is styled `touch-action: none` (line ~6093), so a touch that
  starts on the slider is never scrolled by the browser. That is today's
  behaviour, and a swipe on the Row does not change it.
- Pointer events from the slider bubble to the Row wrapper through React. The
  options are:
  - **Stop propagation** at the slider (`onPointerDown={e => e.stopPropagation()}`
    on `Slider`'s wrapper div, bubble phase). In React's bubble order this runs
    *after* `ControlSlider`'s own handlers, so it would not freeze the slider.
    But it makes the Row's gesture state depend on what it *didn't* see
    (`filterTaps` would act on a stale `tap` from the previous gesture), and it
    couples `Slider` to the knowledge that some ancestor swipes. The existing
    comments in `Slider.tsx` deliberately avoid swallowing pointer events.
  - **Gesture ownership (recommended):** mark the slider region
    (`data-gesture-owner` on `Slider`'s wrapper div) and have the Row's handler
    decide once, on `first`, from `event.target.closest(...)`. It ignores the
    whole gesture through `memo`. The Row still computes `tap` correctly, so its
    click guard lets a slider tap through, and a slider drag's click is
    swallowed, which the slider's own `filterTaps` would have done anyway.
    Nothing in `Slider.tsx` has to know swipes exist.
- The existing `onClick={e => e.stopPropagation()}` around the slider in
  `RoomRow.tsx` stays. It stops a slider tap from also toggling the light.
- `Slider`'s `onInteracting`/`disableModal={slider.sliding}` plumbing exists only
  to disarm the long-press modal. Once Rows always pass `disableModal`, it is
  dead weight for Rows.

---

## 4. Accessibility: WCAG 2.5.1 Pointer Gestures

- **SC 2.5.1 (Level A):** "All functionality that uses multipoint or path-based
  gestures for operation can be operated with a single pointer without a
  path-based gesture, unless a multipoint or path-based gesture is essential."
  The Understanding document names swiping/flicking as path-based. The
  alternative does **not** have to be on the same element: the functionality
  "can also be operated by another method, such as a tap, click, double tap …
  long press". That alternative must not itself be a drag (2.5.7).
  ([Understanding 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html))
- **SC 2.5.7 Dragging Movements (AA)** covers dragging an object *to a position*.
  Direction-dependent gestures belong to 2.5.1. An equivalent control elsewhere
  satisfies it: "It does not have to be the same component, so long as the
  functionality is equivalent."
  ([Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html))
- **Apple HIG (Gestures):** a custom gesture must be "Not the only way to
  perform an important action", and "Use shortcut gestures to supplement
  standard gestures, not replace them". The example given is swipe-back
  alongside a Back button.
  ([HIG Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures))
- **SC 2.5.2 Pointer Cancellation** is met by the recipe as written: the action
  completes on release (up-event), and dragging back under 1/3 before release
  aborts.

Opening the Page is not essential as a swipe, so a single-tap route is required.
The Row's own tap is already taken (toggle). Options, from least intrusive:

1. **A tap target already on the panel.** The footer's `AreaOpenerBlock`
   (`PlacementView.tsx`) opens an Area's Page with one tap. It only counts if
   **every Area that renders as a Row also has a footer Placement**, and nothing
   enforces that today (CONTEXT.md: Placements are per Label). It is zero
   pixels of new UI, but the guarantee rests on labelling discipline.
2. **A trailing chevron on the Row** (`mdi:chevron-right`), a separate tap
   target that opens the Page. It also answers HIG's "Discoverable" point,
   because it hints that the Row leads somewhere. It costs width in an already
   dense Row, and it needs its own capture-safe `onClick` with
   `stopPropagation`, like the slider.

(This is a private home panel, so WCAG conformance is a choice, not an
obligation. The guidance above is what conformance would need.)

---

## 5. Fully Kiosk Browser: settings that can steal the gesture

From the Fully Kiosk manual ([fully-kiosk.com/en](https://www.fully-kiosk.com/en/)):

| Setting (menu) | What the manual says | Risk to the Row swipe / column scroll | Set to |
|---|---|---|---|
| **Web Browsing → Swipe to Navigate** (PLUS) | "swipe left/right to go history forward/back" | A swipe right on a Row is also a "history back" swipe. The dashboard navigates by React state (`Dashboard.tsx`: `setCurrentPage`), not history, so this would leave the dashboard's URL entirely, or do nothing. | **Off** |
| **Web Browsing → Swipe To Change Tabs** (PLUS) | "Swipe left and right to change in open browser tabs" | The same horizontal conflict. | **Off** |
| **Web Browsing → Animate Page Transitions** (PLUS) | Slides frames when navigating | Only meaningful with the above. | Off |
| **Web Browsing → Enable Pull to refresh** | "allow the down pull to reload the current page … can cause misbehavior of some websites where dragging is required." | Competes with vertical scrolling of the columns. *Unverified inference:* the panel's document itself never scrolls (only inner `overflow: auto` columns do), so a native pull-to-refresh that checks the WebView's own scroll position would always see "at top" and could fire while a column is being scrolled up. | **Off** |
| **Kiosk Mode → Kiosk Exit Gesture = Swipe from Left** (default) | "only works if Fully Kiosk app is in foreground. If you have gesture navigation enabled (in Android 10+) you have to hold short at the left edge before swiping out the menu." | A Row in the `left` Region begins close to the screen's left edge. A swipe right that starts on the edge could open Fully's menu or PIN dialog instead. | Keep Rows' swipe area off the extreme edge (the Panel's gutter does this), or choose **Fast 5 Taps** / **Double Tap Top Left + Bottom Right** as the exit gesture. |
| **Web Zoom → Enable Zoom** | "allow zooming" | Double-tap/pinch zoom adds tap delay and competes with multi-touch. `pan-y` already excludes double-tap zoom on the Row. | Off |
| Android **gesture navigation** (system, not Fully) | Android: the back gesture is "an inward swipe from either the left or the right edge of the screen", and a web page cannot opt out (`setSystemGestureExclusionRects` is a native View API). ([Android docs](https://developer.android.com/develop/ui/views/touch-and-input/gestures/gesturenav)) | An edge-started swipe right becomes system Back. | Use 3-button navigation on the tablet, or rely on Fully's immersive fullscreen plus Kiosk Mode's navigation-bar hiding. |

`overscroll-behavior` is a web-content CSS property. It controls the browser's
own overscroll and scroll chaining, but it cannot reach Fully's native
pull-to-refresh wrapper, so the setting has to be turned off in Fully itself.
(That last point is inferred from the architecture, not documented by Fully.)

---

## Could not source

- **Fully Kiosk's edge width** for "Swipe from Left" (how many px count as the
  edge) and whether Swipe to Navigate respects web `touch-action`. The manual
  does not say.
- **Fully's pull-to-refresh implementation** (whether it is Android's
  `SwipeRefreshLayout`, and what scroll check it uses). The risk row above is an
  inference, marked as such.
- **This tablet's actual touch slop.** 8 dp is the AOSP fallback, and vendors can
  override `config_viewConfigurationTouchSlop`.
- **Material Design's swipe-in-list guidance.** m2/m3.material.io pages render
  client-side and could not be read, so Android's `ItemTouchHelper` source
  stands in as the platform's actual behaviour.
- **Spring-back duration and easing.** No primary source gives a value for this
  case. Pick one to match the panel's existing transitions.

---

## By the book

1. **Dependency:** `npm i @use-gesture/react@^10.3.1` in `ha-dashboard/`, a
   direct dependency. It is currently present only as @hakit's auto-installed
   peer.
2. **DOM:** the `RoomRow` wrapper div, outside `Tile`/`CardBase`, gets
   `touch-action: pan-y`, `position: relative` and `overflow: clip`, and the
   `{...bind()}` from `useDrag`. The revealed label sits in an absolutely
   positioned layer underneath. An inner layer carries
   `transform: translateX(offset)`, with no transition while dragging and a
   transition only on spring-back. Do not pass gesture handlers into `CardBase`,
   because its rest-prop spread would override its own handlers.
3. **`useDrag` options:**
   `{ axis: 'x', axisThreshold: { touch: 10 }, threshold: 10, filterTaps: true, tapsThreshold: 10 }`.
   Leave `pointer.capture` at its default (true). No `preventScroll`, no
   `swipe`, no `delay`.
4. **Handler:**
   - On `first`, set `memo` to whether `event.target.closest('[data-gesture-owner]')`
     matched, and ignore the whole gesture when it did.
   - Ignore `tap`.
   - Follow with `x = max(0, movement[0])`.
   - On `last`, **commit** iff not aborted (`canceled` or
     `event.type === 'pointercancel'`) **and** either `x ≥ rowWidth / 3` or
     (`direction[0] > 0 && velocity[0] ≥ 0.5 px/ms && x ≥ 50 px`). Otherwise,
     spring back.
5. **Slider:** add `data-gesture-owner` to `Slider`'s wrapper div. No
   `stopPropagation` of pointer events. Keep `RoomRow`'s existing click
   `stopPropagation` around the slider.
6. **CardBase:** Rows always pass `disableModal`. The inert `use-long-press`
   binding stays and is harmless. Tap-to-toggle and the ripple are
   click-driven, and `filterTaps`' capture-phase click guard suppresses both
   after a swipe.
7. **Accessibility (2.5.1):** give every Row's Area a one-tap route to its Page:
   either a guaranteed footer `AreaOpenerBlock`, or a trailing chevron tap
   target on the Row.
8. **Fully Kiosk:** Swipe to Navigate **off**, Swipe To Change Tabs **off**,
   Pull to refresh **off**, Enable Zoom **off**. Kiosk exit gesture: something
   other than Swipe from Left (e.g. Fast 5 Taps), or keep Rows clear of the
   left edge. On the tablet, prefer 3-button navigation over gesture navigation.
