/**
 * One Area as a Room Tile (#42, CONTEXT.md), ported from Casa Panel's
 * `RoomTile` (ADR-0013). It replaces the Row: the room-list shape of variant
 * D (#6) becomes a tile in its Region's Room Grid (`RoomGrid.tsx`).
 *
 * Tapping the tile opens the Area's Page -- the same one its footer block
 * opens -- and the chevron after its name says so (ADR-0010, amended). The
 * switch and the dimmer drive the Area's `main` light in place. What the
 * tile says and which controls it gets is `roomTile.ts`; this file only
 * draws it. Holding it does nothing, and nothing swipes.
 *
 * Tiles line up across the grid: the top row (icon, switch) is always 48 px,
 * with or without a switch, so every title and meta line sits at the same
 * height, and a dimmer sits at the foot of the tile.
 *
 * The tap target is a transparent button laid over the whole tile, under the
 * content: the content lets taps through to it, and only the switch and the
 * dimmer take their own. Nesting the controls inside one big button would be
 * a button inside a button, which no assistive technology reads.
 */
import { useState } from 'react';
import { useActions, type Area } from '../ha';
import { Dimmer } from './Dimmer';
import { Icon } from './Icon';
import { brightnessPercent } from './lightState';
import { useNavigation } from './NavigationContext';
import { roomTile } from './roomTile';
import { Switch } from './Switch';
import { t } from './theme';

/** Casa Panel's room tile padding, top row and the gap under it. */
const PAD = t.space[5];
const TOP = 48;
const GAP = t.space[4];

/**
 * The least a tile needs, dimmer and all: its padding and border, the top
 * row, the title and meta, and the 56 px dimmer. The Room Grid never makes a
 * row shorter than this; past it the Region scrolls instead.
 */
export const ROOM_TILE_MIN_H =
  2 * PAD +
  2 +
  TOP +
  GAP +
  parseFloat(t.type.tileTitle.lineHeight) +
  t.space[1] +
  parseFloat(t.type.meta.lineHeight) +
  t.space[1] +
  t.size.targetControl;

export function RoomTile({ area }: { area: Area }) {
  const actions = useActions();
  const { openPage } = useNavigation();
  const [pressed, setPressed] = useState(false);
  const { main, lights, lit, fault, meta } = roomTile(area);
  const on = main?.state === 'on';

  const look = fault
    ? { background: t.color.alertSurface, border: t.color.alertLine, icon: t.color.alert, meta: t.color.alert }
    : lights === 'none'
      ? { background: t.color.surfaceStatic, border: t.color.line, icon: t.color.inkMuted, meta: t.color.inkFaint }
      : lit
        ? { background: t.color.litSurface, border: t.color.litLine, icon: t.color.accent, meta: t.color.litInk }
        : { background: t.color.surfaceTile, border: t.color.lineTile, icon: t.color.inkSecondary, meta: t.color.inkMuted };

  // An Unavailable light is shown, never commanded (actions.ts): no controls.
  const controls = main !== null && !fault;

  return (
    <div
      style={{
        position: 'relative',
        boxSizing: 'border-box',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: GAP,
        padding: PAD,
        borderRadius: t.radius.tile,
        border: `1px solid ${look.border}`,
        background: look.background,
        color: look.icon,
        transform: pressed ? 'scale(.98)' : undefined,
        transition: 'transform .12s ease',
      }}
    >
      <button
        type='button'
        aria-label={`Apri ${area.name}`}
        onClick={() => openPage(area.id)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        style={{
          position: 'absolute',
          inset: 0,
          padding: 0,
          border: 'none',
          borderRadius: t.radius.tile,
          background: 'transparent',
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      />
      <div
        style={{
          position: 'relative',
          height: TOP,
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          pointerEvents: 'none',
        }}
      >
        <Icon name={area.icon ?? 'mdi:sofa'} size={30} />
        {controls && (
          // The switch's hit area overhangs the tile's padding, so it can be
          // large without pushing the title down (Casa Panel's -12 / -14).
          <div style={{ margin: '-12px -14px 0 0', pointerEvents: 'auto' }}>
            <Switch checked={on} label={`Luci ${area.name}`} onChange={() => actions.toggle(main)} />
          </div>
        )}
      </div>
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: t.space[1],
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: t.space[1],
            minWidth: 0,
            fontSize: t.type.tileTitle.size,
            lineHeight: t.type.tileTitle.lineHeight,
            fontWeight: t.type.tileTitle.weight,
            letterSpacing: t.type.tileTitle.letterSpacing,
            color: t.color.ink,
          }}
        >
          <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{area.name}</span>
          <span style={{ display: 'flex', flexShrink: 0, color: t.color.inkMuted }}>
            <Icon name='mdi:chevron-right' size={20} />
          </span>
        </div>
        <div
          style={{
            fontSize: t.type.meta.size,
            lineHeight: t.type.meta.lineHeight,
            color: look.meta,
            fontWeight: fault ? 500 : undefined,
            // Wraps rather than ellipsising: at four columns "Nessuna luce
            // collegata" is wider than a tile, and the title above it is what
            // has to line up, not the meta.
          }}
        >
          {meta}
        </div>
        {controls && lights === 'dimmer' && (
          <div style={{ marginTop: 'auto', pointerEvents: 'auto' }}>
            <Dimmer
              // An on light Home Assistant reports at under 1% still reads as
              // on, never as "Spento".
              value={on ? Math.max(1, brightnessPercent(main)) : 0}
              label={`Luminosità ${area.name}`}
              onCommit={v => actions.setBrightness(main, v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
