---
status: accepted
supersedes: ADR-0005, ADR-0007, ADR-0008, ADR-0011, ADR-0012, ADR-0014; ADR-0006 and ADR-0009 in part
---

# OHomeMy: the layout is a document a graphical Builder owns

The panel becomes **OHomeMy**, a HACS custom integration (domain `ohomemy`).
The integration does three things. It stores the layout as a document, it
serves each **Dashboard** in that document as its own Home Assistant panel,
and it gives admins **OHomeMy Builder**, an admin-only panel for editing the
document by dragging widgets on a live preview. Labels and helpers no longer
carry any layout. The house is rebuilt from an empty document in the Builder,
in one hard cutover.

Decided in a design session on 2026-10-06. The storage options, HA's panel and
default-dashboard mechanics and @hakit's behaviour inside a panel are
researched in [layout-storage.md](../research/layout-storage.md).

## Why reverse ADR-0005

[ADR-0005](0005-placement-protocol.md) chose labels because Home Assistant
already had a labelling UI, editable from a phone with no rebuild. It was the
editor ADR-0003 had ruled out. The goal now is a graphical builder, which is
an editor of its own, and once the Builder exists labels are only a storage
format. They are a poor one. They are flat and unordered, so they cannot hold
position, order or per-placement settings. They show up in every entity's
label picker. And anyone can edit them outside the Builder, which would leave
two sources of truth.

The Regions go with the labels. Each Region decided the shape of whatever was
Placed in it (the Rendering contract). On a drag-and-drop preview that means a
component changes shape in the middle of a drag, and every new screen size
would need a new template. Layout becomes a free grid, and shape becomes a
setting on each widget.

## The decisions

### Distribution

- **One integration ships both the renderer and the Builder.** It is versioned
  as one thing and replaces the SSH deploy into `/www`. It is set up through a
  single-instance config flow with no YAML.
- **Development stays in this repo**, under `custom_components/ohomemy/`. A
  release workflow builds both frontends into a release zip and pushes it to a
  **separate public repo** that HACS installs from. HACS cannot install from a
  private repo, and the docs in this one describe a real house's gates, cameras
  and alarm.
- **For now the product is for one house.** It is installable through HACS but
  built so it could be published later.

### Storage

- **One versioned document in a `helpers.storage.Store`.** It is saved
  immediately with atomic writes, and the version and minor version carry the
  migrations. It also carries a **revision** counter. HA backups already
  include `.storage/`.
- **Websocket commands.** Any authenticated user can call `get` and
  `subscribe`. Subscribe sends the whole document and its revision on connect
  and again after every save. `save` is admin-only: it takes the whole
  document plus the revision it started from, and is refused with `conflict`
  if another Builder saved first. A panel's `require_admin` only hides the
  panel from listings, so the admin check has to be on the command.
- **A history store** of past saves for undo, and **export/import** of the
  document as JSON.
- **The server checks the document's structure in plain Python.** HA core is
  replacing voluptuous with probatio, so we depend on neither. What makes a
  widget valid (the rules that replace the Rendering contracts) lives in a
  shared TypeScript schema module. The Builder only offers valid choices, and
  the renderer silently skips anything invalid, as before.
- **Rejected:**
  - `StorageCollection` has no order, moving an item takes two writes, it
    saves on a delay, and the last write wins.
  - Lovelace storage can be read by every user, has no validation and no
    conflict check, and needs Lovelace's private internals.
  - Config entry options cannot be read by the frontend, and every change
    reloads the integration.
  - A YAML file would need its own atomic writes and file watching, and the
    Builder's saves would lose its comments.
  - Labels with a sidecar store for order and settings: the sidecar ends up
    being the layout.

### Dashboards

- **There can be any number of Dashboards, and they are unrelated to each
  other.** Each one is a separate thing: its own Pages, its own home Page, and
  its own supported screen sizes. A Dashboard can be duplicated.
- **Each Dashboard is its own HA panel** at `/ohomemy-<slug>`, registered at
  runtime with `require_admin=False` and `embed_iframe=False`. The slug is
  fixed when the Dashboard is created and does not change on rename. The
  panel's `config` holds only the Dashboard's id, because a change to the
  panel's info makes HA recreate the element; the layout arrives through
  `subscribe`. Panels exist only in memory, so they are registered again from
  the store on every setup. Whether a Dashboard appears in the sidebar is a
  per-Dashboard setting, on by default.
- **Every logged-in user can open every Dashboard.** They all show the same
  house's entities, which any user can already control in HA, so restricting
  them per user would protect nothing.
- **Only an admin, in the Builder, sets a user's default Dashboard.** HA's own
  pickers list only built-in and Lovelace dashboards. The integration writes
  the user's `default_panel` through HA's internal
  `frontend.storage.async_user_store`, and also offers HA's system-wide
  default. A test pins the internal call, so an HA upgrade that moves it fails
  loudly. A wall tablet logs in as its own non-admin user, with "Always hide
  the sidebar" on and "suspend when hidden" off.

### Inside a Dashboard

- **Pages are laid out on a free grid of widgets.** A widget has a position, a
  size, a variant (full or compact where one exists) and its own settings.
  Each Dashboard is set to **fit to screen** (the Page never scrolls, and a
  widget scrolls inside its own box) or to **scroll**. The grid is
  proportional. Each Dashboard declares the range of screen sizes it
  supports, the Builder previews the smallest and largest of them, and widgets
  adapt to their box. This lets one Dashboard serve tablets of similar sizes.
  Outside the range it renders anyway and the Builder warns. Nothing is zoomed
  uniformly, because that would shrink touch targets below Casa Panel's
  minimum.
- **Navigation is explicit.** Any widget can have "on tap: open Page X". A
  **Navbar** is part of the Dashboard's frame: at most one per Dashboard,
  attached to one edge, horizontal or vertical, and composed by the admin from
  Pages and icons. It marks the current Page and has a Tabs mode with a back
  stack per item. A **Link** widget is a tappable block that opens a Page.
  These replace the Dock, the phone Tabs, Page Openers and every navigation
  rule that used to be Derived.
- **Device behaviours are per-Dashboard settings**: the idle return to the
  home Page (or none), the back gesture's history, and light, dark or auto
  mode. The code no longer branches on wall versus phone.
- **The first widgets are the existing components**, plus Link. The Room
  Tile's light and temperature are settings on the widget, which is where the
  `main` Label went. A Group card holds an ordered member list of one Domain.
- **Popups** are opened by a `select.ohomemy_popup` entity that the
  integration provides. Its options are the Popup names across all
  Dashboards, plus none. Each Dashboard lays out its own Page for any Popup
  name and shows nothing for a name it does not define. ADR-0009's reasons
  for using state rather than events still hold.
- **Concerns and Faults are counted per Dashboard**, over what that Dashboard
  renders on any of its Pages.

### Builder

- **An admin-only panel**, written in React and @hakit like the renderer, so
  its preview *is* the renderer.
- **Editing is drag and drop on the preview.**
- **Edits go into a local draft.** **Publish** saves the draft together with
  the revision it started from, so the wall tablet never shows a layout
  halfway through an edit.

### Language and themes

- **English by default, with i18n.** The language follows the HA user's
  language setting, and dates, times and numbers follow the HA user's format
  settings. The first languages are en, zh-Hans, hi, es, ar and it, with
  fallback fonts for the scripts Casa Panel's typefaces lack. @hakit is no
  longer pinned to `it`.
- **Text an admin writes is shown as written.** A widget's default title is
  *unset*, which shows the translated default, until someone sets it.
- **Right to left applies inside widgets only.** The grid and the Navbar stay
  where the admin placed them. Components use CSS logical properties.
- **A theme is a named set of token values in light and dark**, applied as CSS
  custom properties. The document stores the theme's name and the mode. Casa
  Panel ships first. Components take colour and radius only from tokens.

### Running inside a panel

@hakit's `HassConnect` already reuses the HA frontend's own connection
(`window.top.hassConnection`). Reading the code shows three problems, which
the first piece of work must confirm before working around them:

1. Styles go into `document.head` and never reach HA's shadow DOM. Each
   Dashboard renders into its own shadow root, with the emotion cache, the CSS
   and the `portalRoot` inside it.
2. HassConnect cannot reconnect after a remount, because its module-level
   `attemptedUrls` is never cleared. One React root per Dashboard survives the
   element being disconnected, and the fix goes upstream.
3. @hakit's handling of a hidden tab would suspend HA's own connection. It is
   given `suspendWhenHidden: false`.

## What is given up

- **Editing the layout outside the Builder.** No layout is editable from HA's
  own UI any more.
- **Derived as a principle.** Nothing chooses a destination or a light behind
  the admin's back. It all appears on the widget, and the admin has to set it.
- **A layout guaranteed by code.** The 2x2 wall design becomes the first
  Dashboard someone builds. The panel no longer promises it. Whether a
  Dashboard fits its screen is checked by eye in the Builder's preview, not by
  the measurement harness of ADR-0007.
- **A panel during the cutover.** The cutover is hard: the old renderer, the
  label code and the SSH deploy go in one release, and the house has no panel
  until its first Dashboard is built.

## What is kept

- [ADR-0002](0002-component-layer.md)'s seam for @hakit.
- [ADR-0010](0010-rows-drop-the-long-press-modal.md)'s rows.
- [ADR-0013](0013-casa-panel-replaces-the-computed-palette.md)'s Casa Panel,
  now the first theme.
- ADR-0006's choice that Pages are state, not a router.
- ADR-0009's choice of state over events.
- The Verdict's ranking, and the rule that a Fault is only reportable if it is
  rendered.

## Settled later

- **The Popup's activity is an integration entity too** (#58). ADR-0009's
  `input_button.panel_popup_activity` becomes `button.ohomemy_popup_activity`,
  which the panel presses, at most every few seconds, on a touch inside an
  open Popup. An automation restarts its auto-close wait when the button's
  state changes. The house then needs no helper of its own for Popups, and
  the button exists exactly when the select does. A `button` rather than an
  `event` entity, because the panel can press a button with an ordinary
  service call that any user may make, and an `event` entity has no service
  to trigger it from outside the integration.
- **A Popup cannot be named `none`**, the select's option for no Popup open.
  The server refuses such a document.
