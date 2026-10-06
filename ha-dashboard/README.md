## Prerequisites
Node version manager - [NVM](https://github.com/nvm-sh/nvm) to easily install and manage node versions

## Local Development
Simply, run `nvm use && npm i && npm run dev` and it will start a local server for you to develop on, it will also watch for changes and reload the page for you. 

## Dependencies

```json
Node.js >=18.0.0
npm >=7.0.0
```

## Building
Run `npm run build` and it will build the files for you, you can then upload them to your home assistant instance using the deploy script mentioned below.

`npm run build:panel` builds the same renderer as a Home Assistant panel instead: `dist-panel/ohomemy-dashboard.js` defines the `<ohomemy-dashboard>` element for a `panel_custom` with `embed_iframe: false`. See `docs/research/hakit-in-a-panel.md` for why it is built differently.

## The document-driven renderer (OHomeMy)

`src/renderer/` draws one Dashboard of the OHomeMy document (ADR-0015): the panel element always does, and the dev server does when given `?dashboard=<slug>`, e.g. `http://localhost:5173/local/ha-dashboard/?dashboard=wall`, against the Home Assistant in `.env.development`. Without the parameter the dev server still shows the label-driven panel until the cutover (#61).

- `src/document/types.ts` is the document's shape; `src/document/schema.ts` is what makes a Widget valid (field types, `validateWidget`, `fitsGrid`). The renderer skips an invalid Widget without a word; the Builder offers only what a schema allows.
- `src/renderer/grid.ts` is the proportional grid: a Page's columns share its width, its rows share one screen's height, and each Widget's box is a size container named `widget`.
- `src/theme/themes.ts` holds the themes, applied as CSS custom properties on the shadow root (`:host`), in light, dark or `auto`.

### Adding a Widget kind

A kind is one folder, `src/widgets/<kind>/`, named exactly as `Widget.kind` (`room_tile`, `camera_wall`). Nothing else needs editing: `src/widgets/registry.ts` finds every `src/widgets/*/index.ts` by itself.

1. **`schema.ts`**: the kind's `defineSchema({ kind, variants, titled, settings })`. Settings are written in the field types of `src/document/schema.ts` (`entity`, `entities`, `area`, `areas`, `boolean`, `choice`, `number`, `text`, `icon`). If none fits, add the new type there, with its check and its value type, and a test. No React here, so a `schema.test.ts` beside it runs under `npm test`.
2. **The component**, e.g. `RoomTileWidget.tsx`: it receives `{ widget, settings }` (`WidgetProps`), with the settings already checked, defaults filled in and entities Home Assistant no longer has dropped. It fills its box at any size, from the smallest to the largest screen of a Dashboard's supported range: adapt with container queries on `widget`, never with the screen size or `isPhone`. Take colour, radius and type from the theme's custom properties (`var(--lit-surface)`, `var(--radius-tile)`, `var(--type-meta-size)`), not from values. A `null` `widget.title` shows the kind's Default title (`shownTitle`); `''` shows none. Import @hakit only through `src/ui` and `src/ha`; take building blocks from their own modules (`../../ui/Tile`) so two kinds added at once do not both edit `src/ui/index.ts`.
3. **`index.ts`**: `export default defineWidget({ schema, Component, css })`. `css` is the kind's own stylesheet, put once into the shadow root; start its classes with `ohm-<kind>-`.

`src/widgets/clock/` and `src/widgets/toggle/` are the two to copy from.

## Deploy to Home Assistant via SSH
1. Replace the values in the .env file provided with your `VITE_SSH_USERNAME`, `VITE_SSH_HOSTNAME` and `VITE_SSH_PASSWORD`.
2. To automatically deploy to your home assistant instance, you can run `npm run deploy` after you've retrieved the SSH information specified [here](https://shannonhochkins.github.io/ha-component-kit/?path=/docs/introduction-deploying--docs), NOTE! The script has already been created for you, you just need to run it after you've updated the .env values.
3. The `VITE_FOLDER_NAME` is the folder that will be created on your home assistant instance, this is where the files will be uploaded to.

## The tablet (Fully Kiosk Browser)

A Row opens its Area's Page when it is swiped right (#27). Several Fully Kiosk
and Android features claim horizontal swipes or vertical pulls for themselves,
and have to be turned off on the panel, or the swipe (or a Region's scroll)
does something else. Why each one matters is in
`docs/research/row-swipe-gesture.md`, section 5.

- **Web Browsing → Swipe to Navigate**: off. A swipe right would be history-back.
- **Web Browsing → Swipe To Change Tabs**: off.
- **Web Browsing → Enable Pull to refresh**: off. It competes with scrolling a Region.
- **Web Zoom → Enable Zoom**: off.
- **Kiosk Mode → Kiosk Exit Gesture**: anything but *Swipe from Left*, e.g.
  *Fast 5 Taps*. A Row in `left` starts near the screen's left edge.
- **Android system navigation**: prefer 3-button navigation to gesture
  navigation, whose edge swipe is system Back and can't be refused by a web page.

Still to check on the real device: how wide Fully's left-edge zone is, and the
tablet's actual touch slop (the swipe assumes Android's default 8 dp).

## Folder name & Vite
The `VITE_FOLDER_NAME` is the folder that will be created on your home assistant instance, this is where the files will be uploaded to. If you change the `VITE_FOLDER_NAME` variable, it will also update the `vite.config.ts` value named `base` to the same value so that when deployed using the deployment script the pathname's are correct.

## Typescript Sync

1. Replace the values in the `.env` file provided with your own if the script hasn't handled this for you already
2. The `VITE_HA_URL` should be a https url if you want to sync your types successfully.
3. The `VITE_HA_TOKEN` instructions can be found [here](https://shannonhochkins.github.io/ha-component-kit/?path=/docs/introduction-typescriptsync--docs) under the pre-requisites section.

Once you have both the above environment variables set, you can run `npm run sync` and it will create a file for you, you then just have to add it to the tsconfig.json.

### HA TOKEN
The token by default will only be used by local development and the sync-script, if you wish to have your token bundled with your project you can move the declaration in the `.env.development` file to the `.env` file, then remove the `.env.development` file as well as update the `scripts/sync-types.ts` file to remove the `.env.development` loader.

## Further documentation
For further documentation, please visit the [documentation website](https://shannonhochkins.github.io/ha-component-kit/) for more information.



# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
