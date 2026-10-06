# Where the Builder's layout should live

Research for the move to a HACS custom integration that serves the renderer and
registers an admin-only sidebar panel holding a graphical **Builder**. The
Builder has to persist a **layout**: an ordered list of Pages, each with the
four Regions (`glance`, `left`, `right`, `footer`), each holding ordered items
(Areas, entities, groups, Page Openers) with per-item settings. Today the same
information is spread over labels (`page:<page>:<region>`, `main`, `ignored`)
and helpers (see `CONTEXT.md`, `docs/protocol.md`, ADR-0005, ADR-0008). The
working proposal is: *the integration owns a layout document in `.storage/` via
`helpers.storage.Store`, exposed over custom websocket commands, and the labels
are retired after a one-time import.* This note checks that proposal against
the alternatives.

- **Date:** 2026-10-06
- **Scope:** six storage candidates, compared on robustness, live updates,
  server-side admin enforcement, concurrent edits, undo, how much code we own,
  and lock-in. It also covers the HACS constraints on shipping the integration.
- **Sources pinned at:** home-assistant/core `dev` @ `14ccef2` (2026.11.0.dev0),
  cross-checked against the `2026.9.4` release tag where the two differ.
  home-assistant/frontend `dev` @ `59444f7`, hacs/documentation `main` @
  `d8800f6`, developers.home-assistant `master` (fetched 2026-10-06). Every core
  path below is relative to `homeassistant/`.
- **Marking:** **[verified]** means read in source or first-party docs.
  **[estimate]** means derived, not measured. **[design]** means a
  recommendation, not a fact about HA.

---

## 1. Answer in brief

1. **Keep the proposal, but write it as one versioned document with a revision
   counter, not as a collection.** The best fit is option 1: a single
   `Store(version, minor_version, atomic_writes=True)` holding the whole layout,
   saved immediately, plus three custom websocket commands:
   - `get`/`subscribe`, open to any authenticated user. The subscribe command
     pushes the whole document plus its `revision` on subscribe and on every
     change.
   - `save`, behind `require_admin`, which takes the full document and a
     `base_revision` and is refused if another save got there first.
   This is about 150–250 lines of Python **[estimate]**. Every mechanism is
   copied from HA's own code: Store migrations, the subscribe pattern in
   `StorageCollectionWebsocket`, and `require_admin`.
2. **`StorageCollection` (option 2) is the wrong shape for a layout.** It has no
   ordering, no multi-item transaction, a 10-second delayed save, and no
   compare-and-swap. In our layout the Pages depend on each other: cross-Page
   moves, Page order, and Page Openers that point at Pages. A collection with
   one item per Page turns each of those into several non-atomic writes. Copy
   its `_ws_subscribe` code, not the class.
3. **Lovelace storage (option 3) gives the most for free and fits the worst.**
   It has an admin-only save, a `lovelace_updated` event that non-admins may
   subscribe to, backups, and no Python storage code. But `lovelace/config` is
   readable by **every** user for **every** dashboard, and the save does no
   schema validation and no concurrency check. A storage dashboard also always
   registers a Lovelace sidebar panel that would try to render our document as
   Lovelace views. Creating that dashboard from an integration means reaching
   into Lovelace's private `hass.data` or driving its websocket API as an
   admin. It only becomes coherent if the renderer itself becomes a Lovelace
   **custom view type**, which is a different architecture (§4.3).
4. **Config entry options or subentries (option 4) and a YAML file (option 5)
   are worse at every point that matters.**
   - Options and subentries live in the shared `core.config_entries` file. They
     are edited through form-based flows, not by a drag-and-drop UI, they are
     not exposed to the frontend, and every change fires the entry's update
     listeners, which conventionally reload the integration.
   - With YAML we own atomicity, file watching and validation, and we lose
     comments whenever the Builder writes the file.
   - Neither can sit inside `custom_components/`, because HACS replaces that
     directory on upgrade.
5. **Labels plus a sidecar (option 6) gives the worst of both.** Labels cannot
   carry order or per-placement settings (ADR-0008 already ran into this), so
   the sidecar ends up holding most of the layout. There are then two sources
   of truth that can be edited independently, and nothing makes a change to
   both atomic.
6. **On HACS:** the repo must be **public**, and `vallops99/homeassistant-frontend`
   is currently private. The repo must hold exactly one
   `custom_components/<domain>/`. HACS does not build anything, so the built
   renderer and Builder bundles must either be committed inside that directory
   or shipped in a release zip (`zip_release` + `filename`).

---

## 2. What HA's storage helper actually guarantees

All three code-owning options (1, 2 and 4) sit on `helpers/storage.py` `Store`,
so its guarantees are the baseline.

- **Writes are all-or-nothing, even without `atomic_writes`.** The default
  writer `write_utf8_file` writes a `NamedTemporaryFile` in the same directory
  and then `os.replace`s it over the target (`util/file.py`) **[verified]**.
  `atomic_writes=True` switches to `write_utf8_file_atomic` (the `atomicwrites`
  library), which adds an **fsync**. The docstring says to use it only "to
  write mission critical files" because fsync can block. HA turns it on for the
  area, device, floor, label, category and issue registries, core config, and
  the auth providers (`grep atomic_writes=True`) **[verified]**. A layout that
  changes a few times a day is a good fit for fsync.
- **Versioning and migration are built in.** `Store(hass, version, key,
  minor_version=…)` stores `{version, minor_version, key, data}`. On load, a
  mismatch calls `_async_migrate_func(old_major, old_minor, old_data)` (a
  subclass override) and immediately re-saves the migrated data. A stored
  major version newer than the code raises `UnsupportedStorageVersionError`, so
  a downgrade fails loudly and does not corrupt the file
  (`helpers/storage.py` `_async_load_data`) **[verified]**.
- **Corruption is contained.** If the JSON fails to decode, the file is renamed
  to `<path>.corrupt.<isotime>`, a fixable **CRITICAL** repair issue is raised
  that tells the user to restore from backup, and load returns `None`, so the
  integration starts empty instead of crashing (same function) **[verified]**.
- **A delayed save survives a clean shutdown and is lost on a crash.**
  `async_delay_save(func, delay)` registers an `EVENT_HOMEASSISTANT_FINAL_WRITE`
  listener, so a pending write is flushed on a clean stop
  (`_async_ensure_final_write_listener`) **[verified]**. A crash or power loss
  inside the delay window loses the write **[estimate: follows from the code]**.
  `async_save` writes right away.
- **Backups include it.** The core backup archives the whole config directory
  (`backup/manager.py` uses `origin_path=Path(self._hass.config.path())`) minus
  `EXCLUDE_FROM_BACKUP` (`backup/const.py`), which excludes only caches, logs,
  `tts/*`, `.cache/*` and backup tarballs **[verified]**. So `.storage/*`,
  `/config/*.yaml` and `custom_components/` are all backed up. Labels live in
  `.storage/core.label_registry` and are backed up too.

---

## 3. Server-side admin enforcement: the panel flag is cosmetic

`panel_custom.async_register_panel(..., require_admin=True)`
(`components/panel_custom/__init__.py`) only affects **listing**:
`frontend/get_panels` skips the panel for non-admins
(`components/frontend/__init__.py` `websocket_get_panels`: `if not
user_is_admin and require_admin: continue`) **[verified]**. It does nothing to
the websocket commands the panel calls, so a non-admin user can call them
directly. Enforcement has to sit on each mutating command, through
`@websocket_api.require_admin`, which raises `Unauthorized` when
`not user.is_admin` (`components/websocket_api/decorators.py`) **[verified]**.
That holds for every option. Only option 3 has it already (`lovelace/config/save`
is `require_admin`).

**Reads must not be admin-only.** The wall panel's renderer must read the
layout. The panel-signalling research found today's token belongs to an admin,
but the renderer should not depend on that. HA's own pattern does exactly this
split: `StorageCollectionWebsocket` leaves `/list` and `/subscribe` open to any
authenticated user and makes `/create`, `/update` and `/delete` always
`require_admin`. Its `admin_only=True` flag, documented as "for collections
whose items contain secrets", is the only thing that closes the reads
(`helpers/collection.py`) **[verified]**.

---

## 4. The candidates

### 4.1 `Store` + custom websocket commands (+ subscribe)

**Shape [design].** `.storage/<domain>.layout`:

```json
{ "version": 1, "minor_version": 1, "key": "casa_panel.layout",
  "data": { "revision": 42, "pages": [ { "id": "main", "title": "Casa",
            "regions": { "glance": [...], "left": [...], "right": [...], "footer": [...] } } ] } }
```

Each item is something like `{ "kind": "area" | "entity" | "group" |
"page_opener", "ref": "<id>", "settings": {...} }`. Order is the order of the
arrays, so no `order` fields are needed.

**Commands [design]** (named after HA's own `config/*` conventions):

| Command | Auth | Does |
|---|---|---|
| `casa_panel/layout/get` | any user | returns `{revision, layout}` |
| `casa_panel/layout/subscribe` | any user | `result`, then an `event` with `{revision, layout}`; another `event` on every save; unsubscribe removes the listener |
| `casa_panel/layout/save` | `require_admin` | `{base_revision, layout}`: validate, refuse with `conflict` if `base_revision != revision`, else `revision += 1`, `await store.async_save(...)`, notify subscribers |
| `casa_panel/layout/history` / `restore` (optional) | admin | list or restore the last N revisions |

The subscribe pattern can be lifted almost line for line from
`StorageCollectionWebsocket._ws_subscribe`: a `set[(connection, msg_id)]`, one
change listener added when the first subscriber arrives and removed after the
last one, `connection.subscriptions[msg["id"]] = cancel`, then
`send_message(result_message(...))` followed by an initial
`event_message(...)` (`helpers/collection.py`) **[verified as HA's pattern]**.
`helpers.dispatcher` would also work for the fan-out, but an in-process
listener list is enough when the store and the websocket handlers are in the
same module.

- **Robustness:** everything in §2. It is atomic with fsync, versioned with
  migrations, contains corruption, and is backed up. Saving with `async_save`
  instead of a delayed save means a crash never loses an acknowledged edit
  **[design]**.
- **Live updates:** pushed by us, and the whole document is small (a few KB),
  so each event can carry all of it. A reconnecting client gets a fresh
  snapshot on re-subscribe, so a missed event cannot leave it stale. This is
  the same property the Popup design relies on in `panel-signalling.md`.
- **Concurrent Builders:** the `base_revision` check turns "last writer wins"
  into "second writer is told". The losing Builder already holds the new
  document from its subscription, so it can show a conflict or offer a reload.
  HA offers nothing better than last-writer-wins anywhere (see options 2–3).
- **Undo/history:** undo inside a session belongs in the Builder. History that
  survives a restart takes one second `Store` holding a ring of the last N
  `{revision, saved_at, user_id, layout}`. That costs about 30 lines
  **[estimate]**.
- **Code we own:** the schema, validation, a migration function, four commands
  and a listener list.
- **Lock-in:** the document is plain JSON in a file we define. Export and import
  are trivial, and nothing depends on HA internals beyond the public `Store`,
  websocket and panel APIs.

### 4.2 `StorageCollection` + `DictStorageCollectionWebsocket` (one item per Page)

This is what HA uses for input_* helpers, Lovelace dashboards and resources,
persons, tags and zones. The subclass supplies `_process_create_data`,
`_get_suggested_id`, `_update_data` and a schema, and gets
`<prefix>/list|create|update|delete|subscribe` for free, with admin enforced on
the writes (`helpers/collection.py`) **[verified]**.

Where it fits our layout badly:

- **No ordering.** Items are a dict, saved in insertion order
  (`_base_data_to_save`), and there is no `reorder` command. Reordering Pages
  needs an `order` field (an N-item update) or a custom reorder command. The
  area registry does the latter, with its own `config/area_registry/reorder`,
  outside any collection (`components/config/area_registry.py`) **[verified]**.
- **No transactions.** Moving an item from Page A to Page B is two `update`s.
  Each one fires its own change event (`async_update_item` → `notify_changes`),
  so subscribers briefly see the item on both Pages or on neither **[verified:
  one event per call]**.
- **Delayed save.** `_async_schedule_save` → `store.async_delay_save(...,
  SAVE_DELAY)` with `SAVE_DELAY = 10` **[verified]**. That is safe on a clean
  shutdown and loses up to 10 s of edits on a crash.
- **No concurrency control.** `_update_data` merges whatever arrives, so the
  last write wins.
- **It solves problems we don't have.** Its main payoff is `_CollectionLifeCycle`,
  which creates and removes an *entity* per item. We don't want an entity per
  Page.
- **Version drift.** On `dev` the schemas are `probatio`, which replaces
  voluptuous in core (`pyproject.toml` pins `probatio==0.13.0`, bans
  `voluptuous` imports, and drops it from `package_constraints.txt`).
  `2026.9.4` still uses `voluptuous` **[verified]**. Subclassing a core helper
  ties our schema code to that migration. A standalone `Store` + our own
  validation (or a schema library we vendor in `manifest.json`
  `requirements`) does not **[design]**.

**Verdict:** wrong granularity. If items were independent records (for example
a list of saved scenes), it would be the right tool. Use its subscribe pattern,
not the class.

### 4.3 Reusing Lovelace storage

What HA gives (`components/lovelace/websocket.py`, `dashboard.py`) **[verified]**:

- `lovelace/config {url_path}` → the stored `config` as JSON. It has **no
  `require_admin`**, so any authenticated user can read any dashboard's
  config, whatever that dashboard's `require_admin` flag says.
- `lovelace/config/save {url_path, config}` is `require_admin`. `config` is
  `probatio.Any(str, dict)`, with no further validation. It calls
  `LovelaceStorage.async_save`, which fires `lovelace_updated {url_path}` and
  then `await self._store.async_save(...)`. That is an immediate,
  non-fsync'd, all-or-nothing write to `.storage/lovelace.<dashboard_id>`, with
  `CONFIG_STORAGE_VERSION = 1` and no migration hook of ours.
- `lovelace_updated` is in `SUBSCRIBE_ALLOWLIST` (`auth/permissions/events.py`),
  so non-admins may subscribe (`websocket_api/commands.py`
  `handle_subscribe_events`). The event carries only `url_path`, and the client
  refetches. The HA frontend does exactly this (`src/data/lovelace.ts`
  `subscribeLovelaceUpdates` → `fetchConfig`).
- Every storage dashboard registers a **Lovelace** built-in panel
  (`lovelace/__init__.py` `_register_panel`, `frontend.async_register_built_in_panel(hass,
  DOMAIN, ...)`), with `show_in_sidebar` and `require_admin` per dashboard. The
  dashboard is created through `lovelace/dashboards/create` (admin), and its
  `url_path` must contain a hyphen (`DashboardsCollection._process_create_data`).

Can a non-Lovelace custom panel legitimately use it? **Mechanically yes**,
because the commands are public websocket API and any frontend can call them.
**In practice it is a misuse:**

- The dashboard's own URL would load the Lovelace panel on our non-Lovelace
  document and show an error or empty view. Hiding it from the sidebar doesn't
  remove the route.
- Anyone in Lovelace's raw config editor can overwrite the document with no
  schema check.
- There is no concurrency check: `async_save` overwrites unconditionally.
- Schema evolution lives entirely in our frontend, because Lovelace's store is
  version 1 with no hook for us.
- Creating or finding the dashboard from the integration means touching
  `hass.data[LOVELACE_DATA]` (private) or calling Lovelace's websocket API as
  an admin from the Builder.

**The coherent Lovelace variant** is to make the renderer itself a Lovelace
**custom view type** or **custom dashboard strategy**. The frontend resolves
`type: "custom:<tag>"` to a custom element (`create-element-base.ts`
`_getCustomTag`, used by `create-view-element.ts`). It resolves strategies to
`ll-strategy-<configType>-<name>` (`strategies/get-strategy.ts`, `CUSTOM_PREFIX
= "custom:"`) **[verified]**. The layout would then be the view's config. But
that moves the whole renderer inside Lovelace: Lovelace's view chrome, edit
mode and hass object, plus a Lovelace resource registration for the bundle. It
is a different product decision than "an integration that serves its own
renderer", and it would reopen ADR-0002's component-layer choices. A strategy
also *generates* Lovelace config and does not store a document, so it doesn't
answer the storage question on its own.

**Verdict:** not recommended. What it gives for free (admin save, an event,
backups) is about 50 lines of option 1. What it costs is ambiguity about who
owns the document, global readability, and no validation.

### 4.4 Config entry options / subentries

- `ConfigEntries.async_update_entry(entry, options=… | subentries=…)` compares,
  sets `MappingProxyType`, then `_async_save_and_notify`. That runs **every
  update listener** and schedules a save of the single shared
  `core.config_entries` store (`SAVE_DELAY = 1`) (`config_entries.py`)
  **[verified]**. By convention an update listener reloads the integration, so
  every layout edit would either reload the integration or need a listener
  that doesn't.
- Neither `options` nor subentry `data` is in the entry's API fragment
  (`ConfigEntry.as_json_fragment` lists only metadata and `num_subentries`)
  **[verified]**. The renderer would still need custom read and subscribe
  commands, so this saves nothing over option 1.
- Options and subentries are meant to be edited through **flows**
  (`OptionsFlow`, `ConfigSubentryFlow`: form steps rendered by HA's dialog).
  That is the wrong UI for a drag-and-drop Builder. Writing them directly from
  a websocket command works but goes around the intended path.
- Subentries are a `dict` keyed by ULID with no order, and our document would
  share a file and a version number with every other integration's entries.

**Verdict:** no. Options suit a handful of integration settings (for example
which user the renderer runs as), not the layout.

### 4.5 A YAML file in `/config`

- HA offers no atomic YAML writer for integrations, and no file watcher: YAML
  is read at setup or on an explicit reload. We would own the write (use
  `util/file.write_utf8_file_atomic`), the reload or watch, the validation and
  the migration.
- Builder writes go through a YAML dump, so **hand comments and formatting are
  lost** on the first save. Two writers (a human and the Builder) on one file
  is the concurrent-edit problem with no detection at all.
- It **must not** live in `custom_components/<domain>/`, because HACS replaces
  that directory on upgrade. HACS offers `persistent_directory` precisely
  because files there are otherwise not "kept safe during upgrades" (HACS
  `publish/start.md`, `hacs.json` table) **[verified]**. A file at the
  `/config` root is backed up.
- **Its one real advantage** is that it can be diffed, versioned in git and
  edited by hand. That is better delivered as **export/import** commands on
  top of option 1 **[design]**.

### 4.6 Keep labels, add a sidecar store for order and settings

- Labels are a flat, unordered set per object with no values (ADR-0008, §"Why
  the pair had to go"). Order, per-placement settings, and which Page a Page
  Opener opens all have to live in the sidecar. Once that is true, the sidecar
  is the layout, and the labels are a second partial copy of it.
- Labels can be edited outside the Builder, in HA's entity, area and device
  dialogs. Every such edit leaves the sidecar's order and settings pointing at
  placements that changed underneath them. Writing both stores in one action is
  not atomic, because the label and entity registries and our store are
  separate files with separate save paths.
- One genuine plus is that `label_registry_updated` and
  `entity_registry_updated` are on the non-admin subscribe allowlist
  (`auth/permissions/events.py`) **[verified]**, so the label half gets live
  updates for free. That doesn't help the sidecar half.
- Assigning labels already requires admin (`config/label_registry/*` and
  entity, area and device updates are `require_admin`, e.g.
  `components/config/label_registry.py`) **[verified]**.

**Verdict:** no, beyond the one-time import. Labels do keep one legitimate role
outside the layout: **`ignored`** and similar *per-thing* flags that make sense
to set from HA's own dialogs. Whether that survives is a separate decision.

---

## 5. Comparison

| | 1 Store + WS | 2 StorageCollection | 3 Lovelace storage | 4 Config entry | 5 YAML | 6 Labels + sidecar |
|---|---|---|---|---|---|---|
| Atomic write | yes (fsync opt-in) | yes, **10 s delay** | yes, immediate, no fsync | yes, 1 s delay, shared file | ours to write | two stores, not atomic together |
| Versioning / migration | `Store` migrate func | `Store` migrate func | none for us (v1, frontend-side) | entry `version`/`minor_version`, shared with entry data | ours | ours + label conventions |
| In HA backup | yes | yes | yes | yes | yes (if outside `custom_components`) | yes |
| Live push to all panels | ours (≈30 lines) | built in, per item | `lovelace_updated` + refetch | ours | ours + file watch | labels: built in; sidecar: ours |
| Server-side admin on write | `require_admin` (ours to add) | built in | built in | ours | ours | built in (labels) + ours |
| Read open to non-admin | yes (by choice) | yes (default) | yes, **to everyone, every dashboard** | needs our command | needs our command | yes |
| Concurrent Builders | **revision CAS (ours)** | last-writer-wins | last-writer-wins | last-writer-wins | none | last-writer-wins, split-brain |
| Ordering of Pages / items | native (arrays) | needs `order` or reorder cmd | native | none (subentries) | native | sidecar only |
| Cross-Page move atomic | yes | no (2 events) | yes | yes | yes | no |
| Undo / history | Builder + optional ring store | none | none | none | git, by hand | none |
| Code we own | small, all ours | smaller, schema tied to core | least Python, most ambiguity | moderate, against the grain | most | most |
| Lock-in | none (plain JSON) | low | Lovelace internals and UI | config-entry semantics | none | HA label model |

---

## 6. Recommendation

**Option 1, shaped as:**

1. **One document** in `Store(hass, 1, f"{DOMAIN}.layout", minor_version=1,
   atomic_writes=True)`, subclassed to implement `_async_migrate_func`. Save with
   `async_save`, never a delayed save.
2. **A monotonically increasing `revision`** in the document. `save` takes a
   `base_revision` and is refused with a `conflict` error on mismatch.
3. **Commands:** `get` and `subscribe` open to every authenticated user, `save`
   behind `require_admin`. The subscribe command sends a full snapshot on
   subscribe and the whole document on each change, using
   `StorageCollectionWebsocket._ws_subscribe`'s structure.
4. **Validation on the server**, in the `save` handler: the Region vocabulary,
   item kinds, and that Page Openers point at existing Pages. Any reference to
   an entity, Area or group that no longer exists is kept, and the renderer
   drops it. HA's registries change underneath us, and the document should not
   be rewritten when that happens.
5. **Optional extras:** a second `Store` keeping the last N saved revisions,
   with `history` and `restore` admin commands, and `export`/`import`
   (JSON or YAML) to cover what option 5 offered.
6. **Labels:** import once into revision 1, then stop reading them for layout.

A few things should be decided before building the integration:

- **Repo visibility.** HACS works only with public GitHub repos
  (`publish/start.md` "Only public repositories on GitHub will work with HACS")
  **[verified]**. `vallops99/homeassistant-frontend` is private **[verified:
  `gh api`]**. Either make it public, publish the integration from a separate
  public repo, or install it by hand without HACS.
- **Repo layout.** There must be one directory under
  `custom_components/<domain>/`, and everything the integration needs must be
  inside it. `manifest.json` needs `domain`, `documentation`, `issue_tracker`,
  `codeowners`, `name` and `version`, and the repo needs brand assets
  (`brand/icon.png`) (`publish/integration.md`) **[verified]**.
- **Shipping the built frontend.** HACS copies files and builds nothing. The
  Vite output must sit in `custom_components/<domain>/` (for example a
  `frontend/` subdirectory), either committed or inside a release asset with
  `"zip_release": true, "filename": "<domain>.zip"` in `hacs.json`.
  `zip_release` "is only supported for integrations" (`publish/start.md`)
  **[verified]**. The integration then serves that directory through
  `hass.http.async_register_static_paths([StaticPathConfig(...)])`
  (`components/http/server.py`) and registers the Builder with
  `panel_custom.async_register_panel(..., module_url=..., require_admin=True)`
  **[verified: APIs exist]**. Add a version query string to `module_url` so the
  browser cache is busted on upgrade **[design]**.
- **Python schema library.** Core `dev` has replaced voluptuous with
  `probatio`, and voluptuous is no longer in HA's dependency pins **[verified]**.
  Either validate with plain Python, or declare whatever library we use in
  `manifest.json` `requirements`, so a core release can't take it away.

---

## Sources

- home-assistant/core `dev` @ `14ccef2`:
  - `helpers/storage.py` (`Store`, `_async_load_data`, `async_delay_save`, `_write_prepared_data`)
  - `util/file.py` (`write_utf8_file`, `write_utf8_file_atomic`)
  - `helpers/collection.py` (`StorageCollection`, `SAVE_DELAY`, `StorageCollectionWebsocket`, `_ws_subscribe`)
  - `components/lovelace/websocket.py`, `dashboard.py`, `__init__.py` (`_register_panel`), `const.py`
  - `auth/permissions/events.py` (`SUBSCRIBE_ALLOWLIST`), `components/websocket_api/commands.py` (`handle_subscribe_events`), `components/websocket_api/decorators.py` (`require_admin`)
  - `components/frontend/__init__.py` (`websocket_get_panels`), `components/panel_custom/__init__.py` (`async_register_panel`)
  - `config_entries.py` (`async_update_entry`, `_async_save_and_notify`, `ConfigSubentry`, `as_json_fragment`)
  - `components/config/area_registry.py` (`config/area_registry/reorder`), `components/config/label_registry.py`
  - `components/backup/const.py`, `components/backup/manager.py`
  - `components/http/server.py` (`StaticPathConfig`, `async_register_static_paths`)
  - `pyproject.toml`, `package_constraints.txt` (probatio)
- home-assistant/core `2026.9.4`: `helpers/collection.py` (still `voluptuous`)
- home-assistant/frontend `dev` @ `59444f7`: `src/data/lovelace.ts`, `src/panels/lovelace/create-element/create-element-base.ts`, `create-view-element.ts`, `src/panels/lovelace/strategies/get-strategy.ts`
- developers.home-assistant.io: [Creating custom panels](https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels), [Extending the WebSocket API](https://developers.home-assistant.io/docs/frontend/extending/websocket-api)
- HACS docs (`hacs/documentation` @ `d8800f6`): [General requirements / hacs.json](https://hacs.xyz/docs/publish/start), [Integration requirements](https://hacs.xyz/docs/publish/integration)

---

## 7. Addendum: a per-user default OHomeMy dashboard

Follow-up question. The integration (working name `ohomemy`) lets an admin
create any number of **dashboards** in the Builder. Each one is a React
(@hakit) app rendering one layout document. The goal is that each one behaves
like an HA dashboard: "through HA settings you choose which one a specific user
uses by default", and a wall tablet, logged in as its own HA user, lands on its
dashboard full-screen.

- **Date:** 2026-10-06
- **Sources pinned at:** home-assistant/core `dev` @ `14ccef2` and the `2026.9.4`
  tag. home-assistant/frontend `dev` @ `59444f7` and `20260826.7` (the frontend
  that `2026.9.4` pins). `src/data/panel.ts`, `ha-pick-dashboard-row.ts` and
  `ha-panel-custom.ts` are identical in the two. ha-component-kit `main` @
  `df12c20` (`@hakit/core` 6.0.2, the version this repo uses). Core paths are
  relative to `homeassistant/` and frontend paths to `src/`.

### 7.1 Answer in brief

1. **The default dashboard is a per-user setting with a system-wide fallback.**
   It has been since **2025.12**. The order is: the user's own
   `default_panel`, then the admin's system `default_panel`, then a legacy
   per-browser localStorage value, then `home`. It is stored server-side.
2. **A custom panel can be the default, but HA's pickers won't offer it.**
   Neither picker lists custom panels. Both only list the built-in dashboard
   panels and Lovelace dashboards. The stored value is a free string, though,
   and routing honours any `url_path` that is in the user's `hass.panels`. So
   writing an OHomeMy panel's `url_path` into the setting works.
3. **An admin cannot set another user's default through any HA command.**
   `frontend/set_user_data` always writes the *calling* user's store. The admin
   can only set the system-wide value. A user-specific default for someone
   else needs either a login as that user or our integration writing that
   user's frontend store from Python, which is internal API.
4. **Runtime panel add and remove is fully supported and live.**
   `async_register_built_in_panel` (with `update=True` to change an existing
   panel) and `async_remove_panel` both fire `panels_updated`, which every
   user may subscribe to. The frontend refetches `get_panels` and reroutes.
5. **Full-screen works.** A custom panel with `embed_iframe=False` draws no HA
   header, so all that is left is the sidebar. That goes away with the
   per-browser "Always hide the sidebar" profile toggle (`dockedSidebar =
   "always_hidden"`). There is no `?kiosk` URL option outside Lovelace, and
   none is needed.
6. **@hakit/core already reuses HA's connection when it runs as a panel.**
   `HassConnect` checks `window.top.hassConnection`, which the HA frontend
   sets, before any OAuth. A same-document panel therefore takes the
   "inherited-auth" path, with no login and no token handling. The real work
   is elsewhere:
   - **Shadow DOM.** Emotion and Vite inject CSS into `document.head`, which
     does not reach inside HA's shadow root.
   - **Remounts.** HA recreates the panel element often, and HassConnect
     cannot reconnect after a remount.

### 7.2 How the default dashboard works today

**Where it is resolved** (`data/panel.ts` `getDefaultPanelUrlPath`)
**[verified]**:

```ts
hass.userData?.default_panel || hass.systemData?.default_panel
  || getLegacyDefaultPanelUrlPath() /* localStorage "defaultPanel" */ || DEFAULT_PANEL /* "home" */
```

`getDefaultPanel` then returns `hass.panels[thatPath] ?? hass.panels["home"] ??
notfound`. If the chosen panel isn't visible to the user, they silently get
`home`. The router calls it from `beforeRender` whenever the path is `/` or
unknown (`layouts/partial-panel-resolver.ts` `_getRoutes`).
`home-assistant-main` waits until `hass.panels`, `hass.userData` and
`hass.systemData` are all loaded before rendering a panel, so the redirect
never runs on the fallback by accident **[verified]**.

**Where it is stored** **[verified]**:

| Level | Written by | Command | Server storage |
|---|---|---|---|
| Per user | Profile → *Dashboard* (`panels/profile/ha-pick-dashboard-row.ts`) | `frontend/set_user_data`, key `core`, value `{…, default_panel}` | `.storage/frontend.user_data_<user_id>` (`components/frontend/storage.py` `_UserStore`) |
| System-wide | Settings → Dashboards → ⋮ *Set as default* (`panels/config/lovelace/dashboards/ha-config-lovelace-dashboards.ts` `_handleSetAsDefault`) | `frontend/set_system_data`, key `core`, **`require_admin`** | `.storage/frontend.system_data` (`SystemStore`, 1 s delayed save) |
| Per browser (legacy, read-only fallback) | nothing writes it any more | — | `localStorage["defaultPanel"]` |

- The frontend subscribes to both values (`frontend/subscribe_user_data` and
  `frontend/subscribe_system_data`, key `core`, in
  `state/connection-mixin.ts`). A change therefore takes effect in open
  browsers immediately **[verified]**.
- The profile picker's "Auto (use system settings)" entry stores `undefined`,
  so the system value applies.

**When each arrived** **[verified]**:

- Per-browser selection in the profile: frontend #5360 (2020-03-30).
- **Per-user and system-wide storage**, which replaced per-browser storage:
  frontend #27899 (2025-11-19, "Per device default panel is not supported
  anymore") plus core #155945 (`frontend/*_system_data`, 2025-11-19). Both
  shipped in **2025.12**, which pins frontend `20251203.0`.
  - The 2025.12 release notes say: "If you want your wall tablet to use a
    different dashboard than your other devices, we recommend giving it a
    separate user profile."
  - The key was renamed `defaultPanel` → `default_panel` in #28035.
- `home` as the fallback: frontend #28446 (2026.2). Admin overrides for
  built-in panels: core #162742 and frontend #29572 (2026.3, §7.5).

### 7.3 Can an OHomeMy panel be chosen as the default?

**The UI doesn't offer it** **[verified]**:

- The **profile picker** lists "Auto", then `PANEL_DASHBOARDS` (`home`,
  `light`, `security`, `climate`, `energy`, `maintenance`, if registered),
  then `lovelace/dashboards/list`. It drops `require_admin` dashboards for
  non-admins. Custom panels are not in either source.
- The **Settings → Dashboards** table (`_getItems`) is built from the same two
  sources, so *Set as default* never appears on a custom panel. It also
  refuses `require_admin` items with an alert.

**The stored value is honoured anyway** **[verified]**:

- `default_panel` is validated only as a JSON value (`probatio.Any(bool, str,
  …)`). Any string is accepted.
- `getDefaultPanel` looks it up in `hass.panels`, which is exactly what
  `get_panels` returned for that user. That includes `component_name:
  "custom"` panels the user can see.
- So `default_panel: "ohomemy-kitchen"` makes `/` route to our panel. The
  sidebar also sorts that panel first and the "edit sidebar" dialog refuses to
  hide it (`components/ha-sidebar.ts`, `dialogs/sidebar/dialog-edit-sidebar.ts`).
- The profile picker shows the right title even though the item isn't in its
  list, because `_valueLabel` falls back to `hass.panels[value].title`. The
  user just can't pick it again after changing away.
- **If the panel is `require_admin` and the user is not an admin, or the panel
  has been removed, the user lands on `home`.** Dashboards meant as defaults
  must be registered with `require_admin=False`.

### 7.4 Setting another user's default

- `frontend/set_user_data` has no user parameter. `with_user_store` always
  resolves `connection.user.id` (`components/frontend/storage.py`)
  **[verified]**. No other core command writes another user's frontend data.
- An admin **can** set the **system** default to an OHomeMy panel by calling
  `frontend/set_system_data` `{key: "core", value: {...existing,
  default_panel: "<url_path>"}}`. It must merge, because the `core` object also
  holds onboarding and survey keys. That changes the default for every user
  who has no personal choice **[verified]**.
- **From the integration (Python)**, `homeassistant.components.frontend.storage.async_user_store(hass,
  user_id)` returns the same `UserStore` the websocket uses.
  `await store.async_set_item("core", {**store.data.get("core", {}),
  "default_panel": url_path})` saves immediately and fires the subscriptions.
  That user's open browsers therefore switch live **[verified: code path]**.
  This is **not a public API**: it is a module-level helper of the `frontend`
  component, so pin it with a test and expect it to move **[design]**.

### 7.5 Registering panels at runtime

```python
frontend.async_register_built_in_panel(
    hass, "custom",                       # component_name → <ha-panel-custom>
    sidebar_title=..., sidebar_icon=..., frontend_url_path="ohomemy-kitchen",
    config={"dashboard_id": "...", "_panel_custom": {
        "name": "ohomemy-panel", "module_url": "/ohomemy_static/panel.js?v=…",
        "embed_iframe": False, "trust_external": False, "handle_safe_area": True}},
    require_admin=False, show_in_sidebar=True, sidebar_default_visible=True,
    update=<exists?>)
frontend.async_remove_panel(hass, "ohomemy-kitchen", warn_if_unknown=False)
```

**[verified]** (`components/frontend/__init__.py`, the same in `2026.9.4`
except where noted):

- **Use `async_register_built_in_panel`, not
  `panel_custom.async_register_panel`.** The wrapper only builds
  `config["_panel_custom"]` and calls the built-in function. It does not expose
  `update`, `show_in_sidebar` or `sidebar_default_visible`. We can build the
  same `_panel_custom` dict ourselves.
  - `handle_safe_area` exists from `2026.9` (core #178598).
  - `frontend.async_panel_exists(hass, url_path)` exists from core #168884
    (2026-04).
- **`update=False` raises `ValueError`** if the `url_path` is already
  registered. In `dev` the message names the owner (#179314). Pass `update=True`
  to replace the panel, for example on a rename. Lovelace does the same in
  `lovelace/__init__.py` `storage_dashboard_changed` → `_register_panel(...,
  update)`.
- **Both functions fire `panels_updated`.** That event is in
  `SUBSCRIBE_ALLOWLIST` (`auth/permissions/events.py`), so non-admin frontends
  receive it. The frontend's `subscribePanels` (`data/ws-panels.ts`) refetches
  `get_panels` on every event. `partial-panel-resolver` then rebuilds its
  routes, and sends the browser to the default panel if the current one
  disappeared.
- **Panels are in memory only.** The integration must re-register every
  dashboard from its own `Store` in `async_setup_entry` and remove them on
  unload. `url_path` has no hyphen rule. That rule belongs to Lovelace's
  collection, not to panels.
- **Per-panel options:**
  - `require_admin`: listing only; see §3.
  - `show_in_sidebar`: when False, the panel is routable but not in the
    sidebar.
  - `sidebar_default_visible`: when False, the panel is hidden in the sidebar
    until the user un-hides it (core #155506, 2025.12).
  - `sidebar_title` and `sidebar_icon`.
  - `config`: any JSON dict, delivered as `panel.config` on the element. The
    custom-panel settings live under `config._panel_custom`.
- **Admins can override panels from 2026.3.** `frontend/update_panel`
  (`require_admin`, core #162742) persists title, icon, `require_admin` and
  `show_in_sidebar` overrides for **any** panel, keyed by `url_path`, and
  `get_panels` applies them. The HA UI only exposes it for the built-in
  dashboards, though.
- **Changing the current panel's `PanelInfo` rebuilds it.** Any change, such as
  a new title or config through `update=True`, makes `partial-panel-resolver`
  call `rebuild()`. That removes and recreates `<ha-panel-custom>`, which
  recreates our element (`_updateRoutes` → `deepEqual` →
  `layouts/hass-router-page.ts` `rebuild`). Keep `config` to a stable
  `dashboard_id`, and deliver the layout over our own subscription (§6), not
  through panel config **[design]**.

### 7.6 Full-screen on a kiosk tablet

- **No HA header.** For `embed_iframe=False`, `ha-panel-custom` appends our
  element directly into itself. Its only additions are a
  `--primary-background-color` background and safe-area padding, which
  `handle_safe_area=True` turns off. Any header belongs to the panel itself
  (`panels/custom/ha-panel-custom.ts` `_createPanel`) **[verified]**.
- **The sidebar is the only chrome left.**
  - `home-assistant-main` makes the sidebar a closed modal drawer when the
    viewport is narrow (`max-width: 870px`), when `hass.dockedSidebar ===
    "always_hidden"`, or when `hass.kioskMode` is on.
  - The drawer only opens from `ha-menu-button`, which our panel doesn't
    render. Its swipe handling only closes an open drawer
    (`layouts/home-assistant-main.ts`, `components/ha-drawer.ts`). The result
    is a full-viewport panel **[verified]**.
  - `dockedSidebar` is set in **Profile → "Always hide the sidebar"**
    (`ha-force-narrow-row.ts`). It is stored **per browser** in localStorage
    (`util/ha-pref-storage.ts`), so it is set once on the tablet. It cannot be
    set per user from the server.
- **Undocumented in-page events.** The panel could switch this itself by firing
  either event on `window`, because both are plain `fireEvent`s that HA
  listens for (`state/sidebar-mixin.ts`). They are not public API **[verified
  in source]**:
  - `hass-dock-sidebar` `{dock: "always_hidden"}` persists the setting.
  - `hass-kiosk-mode` `{enable: true}` is in-memory and used by the companion
    apps' `kiosk_mode/set` message and by app ingress.
- **No `?kiosk` URL option.** HA's frontend has none. The `kiosk-mode` HACS
  plugin is Lovelace-only, and Lovelace's own `kioskMode` only hides
  `hui-root` chrome **[verified: grep]**.
- **Browser full-screen** (no address bar) is the kiosk browser's job, for
  example Fully Kiosk or the companion app.
- **Turn off "suspend when hidden" on the tablet.** After 5 minutes hidden,
  `partial-panel-resolver` detaches non-iframe custom panels, and
  `ha-panel-custom` destroys and recreates our element on reattach. The
  per-browser profile setting `suspendWhenHidden` turns this off **[verified]**.

### 7.7 Running @hakit/core inside the panel

**Inherited auth is already built in** **[verified]**
(`packages/core/src/HassConnect/tryConnection.ts`):

- `determineConnectionType` checks, in order: `?auth_callback=1`, then
  **`window.top?.hassConnection`**, then `hassToken`, then saved tokens, then
  an OAuth redirect.
- The HA frontend sets `window.hassConnection = authProm().then(connProm)`,
  which resolves to `{auth, conn}` (`entrypoints/core.ts`). In a non-iframe
  panel, `window.top === window` is HA's window, so `HassConnect` uses HA's own
  `Connection` and `Auth`. There is no login screen and no second socket.
- Our current `App.tsx` (`hassUrl = window.location.origin` in production)
  therefore needs no auth change inside the panel.
- The tablet's login is HA's own login page with "Keep me logged in". HA stores
  `hassTokens` in localStorage (`common/auth/token_storage.ts`). @hakit uses the
  **same key**, but only on its non-inherited paths, so the two never fight
  here.
- There is no prop for passing in the element's `hass` or `connection`. The
  `window.hassConnection` hand-off *is* the bridge. The `hass` prop the element
  receives can be ignored, or used only for `hass.user` and `panel.config`.

**Three things to handle in the panel element** **[verified hazard; fixes
are design]**:

1. **Styles don't reach the app.** `<ha-panel-custom>` renders in light DOM,
   but it sits inside `home-assistant` → `home-assistant-main` shadow roots.
   Emotion (used by `@hakit/components`) and Vite CSS insert into
   `document.head`, so none of it applies.
   - **Fix [design]:** have the custom element `attachShadow()` and render
     React into it.
   - Wrap the app in `CacheProvider` with `createCache({key: "ohm", container:
     shadowRoot})`.
   - Inject `index.css` (`?inline`) as a `<style>` in the shadow root.
   - Pass `options.portalRoot` set to a node inside the shadow root, because
     the default is `document.body`.
   - Only inherited properties and CSS custom properties cross the boundary.
2. **HassConnect cannot reconnect after a remount.** `Provider.tsx` keeps a
   module-level `attemptedUrls` Set that is never cleared, and its unmount
   effect calls `reset()`, which unsubscribes everything. A second mount with
   the same `hassUrl` in the same page therefore skips `connectOnce` and sits
   on the loader. HA destroys and recreates the panel element on navigation
   away and back, on any `PanelInfo` change (§7.5), and after the 5-minute
   hidden timeout (§7.6) **[verified: code reading, not run]**.
   - **Fix [design]:** create **one** React root per page in a module
     singleton, rendered into a persistent container. On `connectedCallback`,
     move that container into the current element's shadow root. Never call
     `root.unmount()` on disconnect. Push `panel`, `route` and `narrow` into
     it through a small store. Alternatively, fix it upstream in @hakit.
3. **Two suspend handlers on one socket.** @hakit's `handleSuspendResume`
   calls `connection.suspendReconnectUntil()`, `connection.suspend()` and
   **`window.stop()`** when the page is hidden. On the inherited connection
   that duplicates HA's own suspend logic on HA's socket. Pass
   `options={{handleResumeOptions: {suspendWhenHidden: false}}}` and let HA
   own the connection **[design]**.

### 7.8 Recommendation [design]

1. **One HA panel per OHomeMy dashboard.** Register it with
   `async_register_built_in_panel(hass, "custom", frontend_url_path=f"ohomemy-{slug}",
   config={"dashboard_id": id, "_panel_custom": {..., "embed_iframe": False,
   "handle_safe_area": True}}, require_admin=False, show_in_sidebar=<per
   dashboard>)`.
   - Re-register all panels from the `Store` on setup.
   - Use `update=True` on rename and `async_remove_panel` on delete.
   - Keep the `url_path` stable across renames, since it is what
     `default_panel` points at.
   - The Builder stays a separate `require_admin=True` panel.
2. **Per-user default.** Add a "Default dashboard for…" control to the
   Builder: a user picker (from `config/auth/list`, admin) plus a dashboard
   picker. It calls an admin-only command such as
   `ohomemy/set_user_default {user_id, dashboard_id | null}`. That command
   merges `default_panel` into the user's `core` frontend data through
   `frontend.storage.async_user_store`. `null` removes the key, which falls
   back to the system default.
   - Also offer "make system default", which merges into `frontend/set_system_data`.
   - This is the only way to set *another* user's default without logging in
     as them. HA's own UI can't list our panels.
   - Cover the internal call with a test, and fall back to "log in as the
     tablet user and run a one-click *Make this my default* button in the
     panel" (`frontend/set_user_data` from the panel) if the helper moves.
3. **Wall tablet setup.**
   1. Create a dedicated non-admin HA user and set its default as above.
   2. On the tablet, log in once with "Keep me logged in".
   3. Turn on Profile → "Always hide the sidebar" and turn off
      "suspend when hidden".
   4. Point the kiosk browser at `http://<ha>/`, which routes to the default.
   Or have the panel fire `hass-dock-sidebar` itself when `panel.config` asks
   for kiosk behaviour, accepting the undocumented event.
4. **Panel element.** Use a shadow root, an emotion cache and `portalRoot`
   inside it, a singleton React root that survives disconnects, and
   `HassConnect` left on inherited auth with @hakit's suspend handling off.

### 7.9 Sources

- home-assistant/core `dev` @ `14ccef2` and `2026.9.4`: `components/frontend/__init__.py`
  (`Panel`, `async_register_built_in_panel`, `async_remove_panel`,
  `websocket_get_panels`, `websocket_update_panel`), `components/frontend/storage.py`
  (`async_user_store`, `UserStore`, `SystemStore`, `frontend/*_user_data`,
  `frontend/*_system_data`), `components/panel_custom/__init__.py`,
  `components/lovelace/__init__.py` (`_register_panel`), `auth/permissions/events.py`,
  `const.py` (`EVENT_PANELS_UPDATED`); `components/frontend/manifest.json` at
  `2025.12.0` / `2026.2.0` / `2026.3.0` / `2026.9.4` for version mapping
- core PRs #155945, #155506, #162742, #164025, #168884, #178598, #179314
- home-assistant/frontend `dev` @ `59444f7` and `20260826.7`: `data/panel.ts`, `data/frontend.ts`,
  `data/ws-panels.ts`, `panels/profile/ha-pick-dashboard-row.ts`, `panels/profile/ha-force-narrow-row.ts`,
  `panels/config/lovelace/dashboards/ha-config-lovelace-dashboards.ts`, `layouts/partial-panel-resolver.ts`,
  `layouts/hass-router-page.ts`, `layouts/home-assistant-main.ts`, `panels/custom/ha-panel-custom.ts`,
  `state/sidebar-mixin.ts`, `state/connection-mixin.ts`, `util/ha-pref-storage.ts`, `components/ha-drawer.ts`,
  `external_app/external_app_entrypoint.ts`, `entrypoints/core.ts`, `common/auth/token_storage.ts`
- frontend PRs #5360, #27899, #28035, #28019, #28446, #29572; release-tag containment checked with the GitHub compare API
- shannonhochkins/ha-component-kit `main` @ `df12c20` (`@hakit/core` 6.0.2): `packages/core/src/HassConnect/{index.tsx,Provider.tsx,tryConnection.ts,token-storage.ts,handleSuspendResume.ts,HassContext.tsx}`
- developers.home-assistant.io: [Creating custom panels](https://developers.home-assistant.io/docs/frontend/custom-ui/creating-custom-panels) (properties `hass`, `narrow`, `route`, `panel`)
- home-assistant.io: [2025.12 release notes, "Set a system-wide default dashboard"](https://www.home-assistant.io/blog/2025/12/03/release-202512/), [Dashboards → Setting a default dashboard](https://www.home-assistant.io/dashboards/dashboards/)
