/**
 * One Area as a Room Tile (#51), ported from `ui/RoomTile.tsx` (Casa Panel's
 * `RoomTile`, ADR-0013) and laid out by its box rather than by a Region. The
 * Room Tile Widget draws one; the Room Grid draws one per Area.
 *
 * The switch and the dimmer drive the chosen light in place. What the tile
 * says and which controls it gets is `roomTile.ts`; this file only draws it.
 *
 * With a Page to open (`page`: a Room Tile Widget's `on_tap`, or a Room
 * Grid Member's, #75), the whole tile opens it but for its switch and dimmer,
 * which keep their taps, and a chevron after the name says so (ADR-0016, the
 * renderer's one named exception, `renderer/tap.ts`). This holds with or
 * without a light, on, off or Unavailable. Without one the tile opens
 * nothing and draws no chevron.
 *
 * The way to the Page is a transparent button laid under the controls, as
 * their sibling, as `ui/RoomTile.tsx` laid it: never around them, since a
 * button inside a button is not readable by assistive technology, and so a
 * drag that starts on the dimmer and ends on the surface (or the reverse)
 * is a click on neither. The switch and the dimmer are positioned, so they
 * paint over it and take their own taps; the icon and the text are not, so
 * a tap on them lands on it.
 *
 * One DOM, two layouts (`ROOM_TILE_CSS`): `full` is Casa Panel's tile, icon
 * and switch over the name and meta, the dimmer at its foot; `compact` is a
 * row, the switch at its end, no dimmer. A `full` tile in a box too short
 * for it gives up the dimmer first, then becomes the row.
 */
import type { Id } from '../../document/types';
import { useActions, useEntities, type Area, type Entity } from '../../ha';
import { tr } from '../../i18n';
import { useDashboardNavigation } from '../../renderer/navigationContext';
import { Dimmer } from '../../ui/Dimmer';
import { Icon } from '../../ui/Icon';
import { brightnessPercent } from '../../ui/lightState';
import { Switch } from '../../ui/Switch';
import type { Variant } from '../../document/schema';
import { roomTile } from './roomTile';

export type RoomTileProps = {
  area: Area;
  /** The shown name: the Widget's title, or the Area's own name. */
  name: string;
  light: Entity | null;
  temperature: Entity | null;
  variant: Variant;
  /** The ordinary Page the tile's surface opens, known to exist (`roomTileTap`), or `null`. */
  page: Id | null;
  /**
   * Marks the tile as a Room Grid's Member (`data-member`, the Area's id), as
   * a Group's rows are marked: the Popup layer reads it to close on its tap,
   * and the Builder's preview to measure and select it.
   */
  member?: boolean;
};

export function RoomTile({ area, name, light, temperature, variant, page, member = false }: RoomTileProps) {
  const actions = useActions();
  const navigation = useDashboardNavigation();
  const house = useEntities();
  const state = roomTile(area, light, temperature, id => house.get(id));
  const look = state.fault ? 'fault' : state.lit ? 'lit' : state.lights === 'none' ? 'static' : 'off';
  // An Unavailable light is shown, never commanded (actions.ts): no controls.
  const chosen = state.fault ? null : state.light;
  const on = chosen?.state === 'on';

  return (
    <div className='ohm-room-tile' data-variant={variant} data-member={member ? area.id : undefined}>
      <div className='ohm-room-tile-body' data-look={look}>
        {page !== null && (
          <button
            type='button'
            className='ohm-room-tile-surface'
            data-opens
            aria-label={tr('renderer.open', { page: navigation.pageName(page) ?? '' })}
            onClick={() => navigation.open(page)}
          />
        )}
        <span className='ohm-room-tile-icon'>
          <Icon name={area.icon ?? 'mdi:sofa'} size={30} />
        </span>
        {chosen && (
          <span className='ohm-room-tile-switch'>
            <Switch checked={on} label={tr('roomTile.switch', { area: name || area.name })} onChange={() => actions.toggle(chosen)} />
          </span>
        )}
        <span className='ohm-room-tile-text'>
          <span className='ohm-room-tile-title'>
            <span className='ohm-room-tile-name' dir='auto'>
              {name}
            </span>
            {page !== null && (
              <span className='ohm-room-tile-chevron' aria-hidden>
                <Icon name='mdi:chevron-right' size={20} mirrored />
              </span>
            )}
          </span>
          <span className='ohm-room-tile-meta'>{state.meta}</span>
        </span>
        {chosen && state.lights === 'dimmer' && variant === 'full' && (
          <div className='ohm-room-tile-dimmer'>
            <Dimmer
              // An on light Home Assistant reports at under 1% still reads as
              // on, never as "Off".
              value={on ? Math.max(1, brightnessPercent(chosen)) : 0}
              label={tr('roomTile.dimmer', { area: name || area.name })}
              onCommit={v => actions.setBrightness(chosen, v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** The least height a `full` tile keeps its dimmer at, and a row its meta. */
export const FULL_TILE_MIN_H = 216;
export const ROW_TILE_MIN_H = 94;

/**
 * The row layout, `compact`'s always and `full`'s in a short box: icon,
 * text, switch, centred on one line, the meta cut rather than wrapped.
 */
const ROW = `
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr);
  grid-template-areas: 'icon text switch';
  align-items: center;
  column-gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
`;
const NARROW_ROW_W = 259;
const narrowRow = (scope: string) => `
  ${scope} .ohm-room-tile-body { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'text switch'; }
  ${scope} .ohm-room-tile-icon { display: none; }
`;
const rowParts = (scope: string) => `
  ${scope} .ohm-room-tile-body { ${ROW} }
  ${scope} .ohm-room-tile-switch { margin-block: -12px; margin-inline: 0 -14px; }
  ${scope} .ohm-room-tile-meta { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  ${scope} .ohm-room-tile-dimmer { display: none; }
`;

/**
 * The tile's own stylesheet; the Room Tile kind puts it in the shadow root,
 * for the Room Grid's tiles as well as its own.
 *
 * The tile is a size container of its own, `room-tile`, rather than reading
 * the Widget's box: in a Room Grid its box is one cell. The thresholds are
 * Casa Panel's measures: a full tile is 216 px tall with its dimmer (padding
 * 20 + border, the 48 px top row, 16, the 26 + 4 + 20 px text, 4, the 56 px
 * dimmer) and 156 without; a row is 94 (padding 16 + border, the switch's
 * 60 px hit area), and 70 without its meta line.
 */
export const ROOM_TILE_CSS = `
  .ohm-room-tile {
    container: room-tile / size;
    height: 100%;
    min-width: 0;
    min-height: 0;
  }
  .ohm-room-tile-body {
    box-sizing: border-box;
    height: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: 48px auto minmax(0, 1fr);
    grid-template-areas: 'icon switch' 'text text' 'dimmer dimmer';
    row-gap: var(--space-4);
    padding: var(--space-5);
    border-radius: var(--radius-tile);
    border: 1px solid var(--line-tile);
    background: var(--surface-tile);
    color: var(--ink-secondary);
    overflow: hidden;
    position: relative;
    transition: transform .12s ease;
  }
  /* The way to the Page, under the switch and the dimmer (positioned, so
     they paint over it), over the icon and the text. */
  .ohm-room-tile-surface {
    position: absolute;
    inset: 0;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: inherit;
    background: transparent;
    cursor: pointer;
    touch-action: manipulation;
  }
  .ohm-room-tile-surface:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }
  .ohm-room-tile-body:has(> .ohm-room-tile-surface:active) { transform: scale(.98); }
  .ohm-room-tile-body[data-look='static'] { background: var(--surface-static); border-color: var(--line); color: var(--ink-muted); }
  .ohm-room-tile-body[data-look='lit'] { background: var(--lit-surface); border-color: var(--lit-line); color: var(--accent); }
  .ohm-room-tile-body[data-look='fault'] { background: var(--alert-surface); border-color: var(--alert-line); color: var(--alert); }
  .ohm-room-tile-icon { grid-area: icon; display: flex; align-self: start; }
  /* The switch's hit area overhangs the padding, so it can be large without
     pushing the name down (Casa Panel's -12 / -14). */
  .ohm-room-tile-switch { position: relative; grid-area: switch; justify-self: end; align-self: start; margin-block: -12px 0; margin-inline: 0 -14px; }
  .ohm-room-tile-text { grid-area: text; display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
  .ohm-room-tile-title { display: flex; align-items: center; gap: var(--space-1); min-width: 0; }
  .ohm-room-tile-chevron { display: flex; flex: none; color: var(--ink-muted); }
  .ohm-room-tile-name {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--type-tile-title-size);
    line-height: var(--type-tile-title-line);
    font-weight: var(--type-tile-title-weight);
    letter-spacing: var(--type-tile-title-tracking);
    color: var(--ink);
  }
  /* Wraps rather than ellipsising in a full tile: the name above it is what
     has to line up across a grid, not the meta. */
  .ohm-room-tile-meta { font-size: var(--type-meta-size); line-height: var(--type-meta-line); color: var(--ink-muted); }
  .ohm-room-tile-body[data-look='static'] .ohm-room-tile-meta { color: var(--ink-faint); }
  .ohm-room-tile-body[data-look='lit'] .ohm-room-tile-meta { color: var(--lit-ink); }
  .ohm-room-tile-body[data-look='fault'] .ohm-room-tile-meta { color: var(--alert); font-weight: 500; }
  .ohm-room-tile-dimmer { position: relative; grid-area: dimmer; align-self: end; min-width: 0; }

  @container room-tile (max-height: ${FULL_TILE_MIN_H - 1}px) {
    .ohm-room-tile-dimmer { display: none; }
  }
  ${rowParts(".ohm-room-tile[data-variant='compact']")}
  @container room-tile (max-height: 155px) {
    ${rowParts('.ohm-room-tile')}
  }
  /* A narrow row gives its icon up before the name is cut to a few letters. */
  @container room-tile (max-width: ${NARROW_ROW_W}px) {
    ${narrowRow(".ohm-room-tile[data-variant='compact']")}
  }
  @container room-tile (max-width: ${NARROW_ROW_W}px) and (max-height: 155px) {
    ${narrowRow('.ohm-room-tile[data-variant]')}
  }
  @container room-tile (max-height: ${ROW_TILE_MIN_H - 1}px) {
    .ohm-room-tile[data-variant] .ohm-room-tile-body { padding-block: var(--space-2); }
  }
  @container room-tile (max-height: 69px) {
    .ohm-room-tile-meta { display: none; }
  }
`;
