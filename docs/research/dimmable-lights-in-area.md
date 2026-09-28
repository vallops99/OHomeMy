# Is there a dimmable light in an Area on the home screen?

Research for the question "is there a way to understand if there are any
dimmable lights in the area we're showing in home screen?"

- **Date:** 2026-09-28
- **Scope:** how `page:main` picks its Areas and their lights, how Home
  Assistant says whether a light can be dimmed, and how this codebase could
  answer "does this Area have a dimmable light?".
- **Sources pinned at:** home-assistant/core `dev` @ `cc999c3`, plus the
  `2025.12.0`, `2026.2.0`, `2026.3.0` and `2026.9.2` tags. home-assistant/frontend
  `dev` @ `83af605`. developers.home-assistant `master` @ `2fb38e8`. @hakit/core
  6.0.2, read from the source maps shipped in `ha-dashboard/node_modules`.
- **Live check:** the local fake-house HA at `:8123` runs **2026.9.2**. It was
  read with GET `/api/states` and the read-only websocket `*/list` commands,
  and nothing was changed.
- **Marking:** **[verified]** means read in source or first-party docs.
  **[observed]** means seen in the live local instance. **[inference]** means my
  reasoning from verified facts.

---

## 1. Answer in brief

1. **Yes, and the repo already has the per-light test.** A light is dimmable
   when its `supported_color_modes` state attribute contains any mode other
   than `onoff`. That is HA core's own `brightness_supported()`, and it is
   exactly what `supportsBrightness()` in `ha-dashboard/src/ui/lightState.ts:15-27`
   checks. "Any dimmable light in an Area" is
   `area.entities.some(supportsBrightness)`.
2. **Don't look at `supported_features`.** The old `SUPPORT_BRIGHTNESS` bit
   (value 1) was only ever translated into `supported_color_modes` by core, and
   the translation was removed in 2026.3. From 2026.3 on, `supported_color_modes`
   is mandatory for every light.
3. **The attribute is there when the light is off, and usually when it is
   unavailable too.** It is a *capability* attribute, written regardless of
   on/off/available. Only `brightness` depends on the light being on.
4. **Light groups answer for themselves.** A `group` light's modes are the
   union of its members' modes, so it is dimmable if any member is.
5. **One real gap: which lights count as "in the Area".** This repo reads
   only the entity's own `area_id` (`registry.ts:123`, `:161-167`). HA, HA's
   frontend and @hakit's own `useAreas` also count entities that inherit the
   Area from their **device**. A dimmer that has only its device assigned to
   "Salone" is invisible to the Row today. It's not visible in the fake house,
   which has no light devices, but it is already true of
   `switch.shelly1minig3_…` in Ingresso **[observed]**.

---

## 2. How the home screen gets its Areas and their lights (this repo)

- The home screen is the Page `main`. `Dashboard` starts on
  `MAIN_PAGE = 'main'` (`ha-dashboard/src/Dashboard.tsx:35`, `:65`) and resolves
  it with `usePage(currentPage)` (`Dashboard.tsx:66`). CONTEXT.md, "Page": "`page:main`
  is the home screen by convention". `docs/protocol.md:52`: `page:main:right`
  is "the home screen".
- `usePage` (`ha-dashboard/src/ha/registry.ts:283-287`) calls
  `resolvePage(areas, entities, page)` (`ha-dashboard/src/ha/placement.ts:131-147`).
  That puts an Area in a Region when the Area itself carries a Placement Label
  for that Page, such as `page_main_right`. Muted Areas (`ignored`) are skipped.
  So the home screen shows **several** Areas, not one. In the fake house all
  eight carry `page_main_right` **[observed]**.
- Each such Area in `left`/`right` renders as a `RoomRow`
  (`ha-dashboard/src/ui/PlacementView.tsx:615`).
- An Area's entities come from `useAreas()` (`registry.ts:156-185`). It groups
  `useEntities()` by `e.areaId` (`:161-167`), and `areaId` is
  `entry.area_id ?? null` from the entity **display** registry
  (`useRegistryData('entitiesRegistryDisplay')`, `registry.ts:89`, `:123`). There
  is no device lookup anywhere in `src/` (grep for `devices` finds none).
- Light state and attributes are merged from `useHass(s => s.entities)`
  (`registry.ts:90`, `:113-117`). An entity with no live state gets
  `attributes = {}` and `state = 'unavailable'`.
- The Row's light is `pickMain(area, 'light')` (`registry.ts:192-195`). That is
  the `main`-labelled light (the Aggregate, often a `group`), and otherwise the
  first light. The "n/m luci" count excludes the `main` light
  (`RoomRow.tsx:39-44`).
- **The Row's slider does not check dimmability today.** It renders whenever
  `main` is not unavailable, and is disabled only when there is no `main` at all
  (`RoomRow.tsx:112-124`, `:146-156`). A lone Placed light, `ToggleTile`, does
  check: `const dimmable = supportsBrightness(entity)` (`ToggleTile.tsx:34`),
  covered by `ha-dashboard/src/ui/lightState.test.ts:23-37`.

## 3. How Home Assistant says a light is dimmable (primary sources)

### 3.1 `supported_color_modes` and `brightness_supported()` [verified]

- `ColorMode` values: `unknown`, `onoff`, `brightness`, `color_temp`, `hs`, `xy`,
  `rgb`, `rgbw`, `rgbww`, `white`
  ([core `light/const.py` L52-68](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/light/const.py#L52-L68)).
- `VALID_COLOR_MODES` is every value except `unknown`, and
  `COLOR_MODES_BRIGHTNESS = VALID_COLOR_MODES - {ColorMode.ONOFF}`
  ([L71-82](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/light/const.py#L71-L82)).
  So **the dimmable modes are everything except `onoff` and `unknown`**:
  `brightness`, `color_temp`, `hs`, `xy`, `rgb`, `rgbw`, `rgbww`, `white`. This
  is the same set as the repo's `DIMMABLE_MODES` (`lightState.ts:15`).
- `brightness_supported(color_modes)` is
  `not COLOR_MODES_BRIGHTNESS.isdisjoint(color_modes)`, and is `False` for
  empty or `None`
  ([core `light/__init__.py` L91-95](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/light/__init__.py#L91-L95)).
- `unknown` can never appear in `supported_color_modes`. Validation rejects it,
  along with `onoff` or `brightness` mixed with other modes, and `white`
  without a colour mode
  ([L75-88](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/light/__init__.py#L75-L88)).
  `unknown` only shows up as a `color_mode`, for example a group's default.
- The developer docs say the same thing in prose. `ONOFF`: "can be turned on
  or off … must be the only supported mode". `BRIGHTNESS`: "can be dimmed …
  must be the only supported mode". Every colour mode "can be dimmed and its
  color can be adjusted" ([light entity docs, L37-47](https://github.com/home-assistant/developers.home-assistant/blob/2fb38e86b05231817f9a51666a0101adf05af570/docs/core/entity/light.md?plain=1#L37-L47);
  rendered at <https://developers.home-assistant.io/docs/core/entity/light>).
  L30-32: "Setting `supported_color_modes` is required."
- HA's own frontend uses the same rule: `lightSupportsBrightness` =
  `supported_color_modes?.some(m => modesSupportingBrightness.includes(m))`,
  where that list is the five colour modes plus `color_temp`, `brightness` and
  `white`
  ([frontend `src/data/light.ts` L26-54](https://github.com/home-assistant/frontend/blob/83af6058b729d9d3ade27b3e6c749aa3c17413cc/src/data/light.ts#L26-L54)).
- **@hakit ships the identical helper.** `lightSupportsBrightness` is exported
  from `@hakit/core` (`node_modules/@hakit/core/dist/types/utils/light/index.d.ts:5`).
  Its source (`src/utils/light/index.ts` L4-29 in the shipped source map) is a
  port of the frontend one. It is typed against `HassEntityWithService<"light">`,
  though, and `src/ha/types.ts` keeps @hakit types out of the seam. So the
  repo's own `supportsBrightness` is the right one to keep.

### 3.2 The deprecated `SUPPORT_BRIGHTNESS` flag [verified]

- Up to 2026.2, a light that set no `supported_color_modes` had them
  *computed* from legacy feature bits. `SUPPORT_BRIGHTNESS` (1) became
  `{brightness}`, and a light with no bits became `{onoff}`
  ([core `2025.12.0` `light/__init__.py` L1342-1379](https://github.com/home-assistant/core/blob/2025.12.0/homeassistant/components/light/__init__.py#L1342-L1379)).
  The constant was a `DeprecatedConstant(1, "supported_color_modes", "2026.1")`
  ([`2025.1.0` L61-62](https://github.com/home-assistant/core/blob/2025.1.0/homeassistant/components/light/__init__.py#L61-L62)).
  That shim was still in `2026.2.0` and is gone in `2026.3.0`.
- Now `_light_internal_supported_color_modes` raises `HomeAssistantError`
  "does not set supported color modes" when a light sets none
  ([`dev` L1105-1113](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/light/__init__.py#L1105-L1113)).
- `LightEntityFeature` now has only `EFFECT = 4`, `FLASH = 8` and `TRANSITION = 32`
  ([`const.py` L44-49](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/light/const.py#L44-L49)).
- **Consequence [inference]:** a client has never needed to read bit 1 of
  `supported_features`. Even with the legacy flag, core published the
  translated `supported_color_modes`. Checking `supported_color_modes` alone is
  correct on every HA version this panel could meet.

### 3.3 On, off and unavailable [verified]

- `supported_color_modes` is a **capability attribute**. `capability_attributes`
  always writes it, sorted
  ([`__init__.py` L889-913](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/light/__init__.py#L889-L913)).
- The base entity puts capability attributes into the state first. It adds
  `state_attributes` only `if available`
  ([core `helpers/entity.py` L1107-1124](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/helpers/entity.py#L1107-L1124)).
  So **off** and **unavailable-but-loaded** lights both keep `supported_color_modes`.
- `brightness` is a *state* attribute. It is present (possibly `None`) whenever
  brightness is supported, and holds a value only in a brightness-carrying
  `color_mode`. `color_mode` is `None` when the light is off
  ([L1053-1080](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/light/__init__.py#L1053-L1080)).
  **Never infer "dimmable" from `brightness` or `color_mode`.** Both are empty
  whenever the light is off.
- An entity whose integration never loaded gets a placeholder state at startup.
  It is `unavailable`, `restored: true`, and carries the registry's stored
  `capabilities`
  ([core `helpers/entity_registry.py` L450-475](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/helpers/entity_registry.py#L450-L475),
  called from [L2734-2744](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/helpers/entity_registry.py#L2734-L2744)).
  It stays dimmable if the light has ever been loaded. If it has no state at all,
  this repo gives it `attributes = {}` (`registry.ts:117`), which reads as "not
  dimmable".
- **[observed]** All 13 lights in the fake house are `off`, and every one reports
  `supported_color_modes: ['brightness']`, `color_mode: null` and
  `brightness: null`.

### 3.4 Light groups [verified]

- A `group` light starts as `{onoff}` and, on every update, sets its modes to
  `filter_supported_color_modes(union of members' supported_color_modes)`
  ([core `group/light.py` L166, L284-295](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/group/light.py#L284-L295)).
  `filter_supported_color_modes` removes `onoff` or `brightness` when richer modes
  are present
  ([light `__init__.py` L58-72](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/light/__init__.py#L58-L72)).
  So a group is dimmable if and only if at least one member reports a dimmable mode.
- The group stays available while any member is not `unavailable`
  ([L226](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/group/light.py#L226)).
- **[observed]** `light.luci_salone_2` and `light.luci_cucina_2` (platform
  `group`, labelled `main`) are off, report `['brightness']`, and list their
  members in `attributes.entity_id`.
- **For "any dimmable light in the Area" [inference]:** including the `main`
  group changes nothing when its members are in the same Area. A group whose
  members sit elsewhere could make the Area look dimmable on its own. Exclude
  the `main` light, as `lightCount` already does, or keep it if the answer is
  about what the Row's slider can drive (§5).

## 4. Which lights are "in an Area" [verified]

- HA's definition: "An entity without an area of its own inherits its device's
  effective area (which a child device in turn inherits from its parent
  device)." That is `entity_registry.async_get_effective_area_id`
  ([`entity_registry.py` L2553-2569](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/helpers/entity_registry.py#L2553-L2569)),
  and on the device side `device_registry.async_get_effective_area_id`
  ([`device_registry.py` L4761-4776](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/helpers/device_registry.py#L4761-L4776)).
  Both exist in 2026.9.2.
- The display registry this repo reads (`config/entity_registry/list_for_display`)
  sends `ai` (area) only as the entity's **own** `area_id`, next to `di`
  (device_id)
  ([`entity_registry.py` L188-195, L284-298](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/helpers/entity_registry.py#L188-L195)).
  It does not resolve inheritance.
- HA's frontend resolves inheritance on the client:
  `entry.area_id || getDeviceAreaId(device, devices)`, where the device falls
  back to its `parent_device_id`'s area
  ([frontend `get_entity_context.ts` L43-57](https://github.com/home-assistant/frontend/blob/83af6058b729d9d3ade27b3e6c749aa3c17413cc/src/common/entity/context/get_entity_context.ts#L43-L57),
  [`get_device_context.ts` L10-21](https://github.com/home-assistant/frontend/blob/83af6058b729d9d3ade27b3e6c749aa3c17413cc/src/common/entity/context/get_device_context.ts#L10-L21)).
- @hakit's own `useAreas` also inherits, one level:
  `t.area_id === area || (!t.area_id && devices[t.device_id]?.area_id === area)`
  (`node_modules/@hakit/core/dist/es/hooks/useAreas/index.js`, function `v`).
  It does not follow `parent_device_id`. The device registry is available as
  `useRegistryData('devices')`
  (`node_modules/@hakit/core/dist/types/hooks/useRegistryData/index.d.ts:5`).
  The device entries from HA carry `parent_device_id` **[observed]**, but @hakit's
  `DeviceRegistryEntry` type doesn't declare it.
- **[observed]** In the fake house every light has its own `area_id` and no
  device, so the gap doesn't show on lights there. It does show on 10 Shelly
  entities in Ingresso, including `switch.shelly1minig3_54320461a9d4`, whose
  area comes only from their device.

## 5. Recommendation

Two questions hide in "a dimmable light in the Area", and the Row needs both:

- **Can the Row's slider do anything?** Use `supportsBrightness(main)`, because
  the slider drives `main` (`RoomRow.tsx:120`, `:154`). This is the check
  `ToggleTile` already makes. A `main` group answers correctly through §3.4.
- **Does the Area have any dimmable light at all?** Use
  `area.entities.some(supportsBrightness)`, optionally excluding `main`.

Put the rule beside `supportsBrightness`, since that module exists so "a state
is interpreted once" (`lightState.ts:1-7`):

```ts
// ha-dashboard/src/ui/lightState.ts
import type { Area, Entity } from '../ha';

/**
 * Whether any light in the Area can be dimmed. The `main` Aggregate is left
 * out, as `lightCount` leaves it out, because it stands for the others rather
 * than being one of them (and a group can reach outside the Area).
 */
export function areaHasDimmableLight(area: Area): boolean {
  return area.entities.some(e => !e.labels.includes('main') && supportsBrightness(e));
}
```

```tsx
// ha-dashboard/src/ui/RoomRow.tsx, sketch only
const main = pickMain(area, 'light');
const dimmable = main !== null && supportsBrightness(main);
// ...render <Slider> only when `dimmable`, as ToggleTile does
```

Then, as a separate decision since it changes every domain's Area membership,
make `areaId` the **effective** area in the seam (`registry.ts`). That way a
device-assigned dimmer counts:

```ts
// ha-dashboard/src/ha/registry.ts, inside useEntities()
const devices = useRegistryData('devices');
// ...
type Dev = { area_id?: string | null; parent_device_id?: string | null };
const deviceArea = (id: string | null | undefined): string | null => {
  const d = id ? (devices?.[id] as Dev | undefined) : undefined;
  if (!d) return null;
  return d.area_id ?? (d.parent_device_id ? ((devices?.[d.parent_device_id] as Dev | undefined)?.area_id ?? null) : null);
};
// ...
areaId: entry.area_id ?? deviceArea(entry.device_id),
```

That mirrors `getEntityAreaId` in HA's frontend (§4), and it adds `devices` to
the memo dependencies. Test it against the pure part, as
`battery.ts`/`deviceBattery` is tested. Expect Ingresso to gain the Shelly
`switch` once this lands. The other nine entities on that device are
`config`/`diagnostic` (already dropped by `registry.ts:108`) or the denylisted
`event` Domain **[observed]**.

## 6. Not verified

- **The real house.** Only the fake house was inspected. Whether any real
  dimmer, such as a Shelly or Zigbee light, is assigned via its device rather
  than itself was not checked. `.env.chri.development` points at another
  instance, which was left alone.
- **Child devices** (`parent_device_id`, `ChildDeviceEntry`) are recent in core.
  I did not establish which HA release introduced them.
- The HA WebSocket API docs don't document the registry `*/list` commands. The
  claims about them come from core source and the live instance.
- No browser run: the Row's current behaviour (slider on a non-dimmable `main`)
  is read from code, not observed on screen.

## Sources

- HA core @ `cc999c3`: [`light/const.py`](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/light/const.py), [`light/__init__.py`](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/light/__init__.py), [`group/light.py`](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/components/group/light.py), [`helpers/entity.py`](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/helpers/entity.py), [`helpers/entity_registry.py`](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/helpers/entity_registry.py), [`helpers/device_registry.py`](https://github.com/home-assistant/core/blob/cc999c32a9a62abada6a9a8cce507d888ac5282b/homeassistant/helpers/device_registry.py). Tags [`2025.1.0`](https://github.com/home-assistant/core/blob/2025.1.0/homeassistant/components/light/__init__.py), [`2025.12.0`](https://github.com/home-assistant/core/blob/2025.12.0/homeassistant/components/light/__init__.py), [`2026.2.0`](https://github.com/home-assistant/core/blob/2026.2.0/homeassistant/components/light/__init__.py), [`2026.3.0`](https://github.com/home-assistant/core/blob/2026.3.0/homeassistant/components/light/__init__.py).
- HA frontend @ `83af605`: [`src/data/light.ts`](https://github.com/home-assistant/frontend/blob/83af6058b729d9d3ade27b3e6c749aa3c17413cc/src/data/light.ts), [`get_entity_context.ts`](https://github.com/home-assistant/frontend/blob/83af6058b729d9d3ade27b3e6c749aa3c17413cc/src/common/entity/context/get_entity_context.ts), [`get_device_context.ts`](https://github.com/home-assistant/frontend/blob/83af6058b729d9d3ade27b3e6c749aa3c17413cc/src/common/entity/context/get_device_context.ts).
- HA developer docs @ `2fb38e8`: [Light entity](https://github.com/home-assistant/developers.home-assistant/blob/2fb38e86b05231817f9a51666a0101adf05af570/docs/core/entity/light.md).
- @hakit/core 6.0.2 (`ha-dashboard/node_modules/@hakit/core/dist`): `types/utils/light/index.d.ts`, `index-BDZyTvOW.js.map` (`src/utils/light/index.ts`), `es/hooks/useAreas/index.js`, `types/hooks/useRegistryData/index.d.ts`.
- Live local HA 2026.9.2: `GET /api/states`, websocket `config/entity_registry/list_for_display`, `config/entity_registry/list`, `config/device_registry/list`, `config/area_registry/list` (read-only).
