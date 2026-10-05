/**
 * A Region's Room Grid (#42, CONTEXT.md, docs/protocol.md "Groups and the
 * Room Grid"): every Area Placed in the Region, together, as Room Tiles under
 * the title *Stanze*, with *Spegni tutto* beside it.
 *
 * The title never varies, because every Room Grid is a grid of rooms; it is
 * not a Group, which holds entities and takes its helper's name. *Spegni
 * tutto* turns off every light that is on in every one of these Areas
 * (`lightsOn`), and while none is, it is visibly not a control: opacity .38,
 * no press, no handler.
 *
 * The grid sizes itself to its Areas (`roomGridShape`) and its tiles share
 * the Region's height, never below a tile's floor (`ROOM_TILE_MIN_H`). Past
 * eight Areas the rows no longer fit, so the grid scrolls, and admits it
 * with the same fade `Panel` gives `left` (ADR-0007): a tile cut off by an
 * unannounced scroll boundary is a room that exists with no sign that it does.
 *
 * On a phone (ADR-0011) the Stanze tab is a column a thumb scrolls already:
 * two tiles to a row, one when there is only one, each its own height.
 */
import { useRef, type CSSProperties } from 'react';
import { useActions, type Area } from '../ha';
import { isPhone } from './device';
import { Icon } from './Icon';
import { useHasMoreBelow } from './useHasMoreBelow';
import { lightsOn, roomGridShape } from './roomGrid';
import { ROOM_TILE_MIN_H, RoomTile } from './RoomTile';
import { SectionLabel } from './SectionLabel';
import { t } from './theme';

function SpegniTutto({ areas }: { areas: Area[] }) {
  const actions = useActions();
  const on = lightsOn(areas);
  const disabled = on.length === 0;
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={() => actions.turnOff(on)}
      style={{
        height: t.size.targetMin,
        padding: `0 20px 0 ${t.space[4]}px`,
        borderRadius: t.radius.pill,
        border: `1px solid ${t.color.lineStrong}`,
        background: 'transparent',
        color: t.color.inkSoft,
        fontFamily: 'inherit',
        fontSize: t.type.body.size,
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space[2],
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.38 : 1,
        cursor: disabled ? 'default' : 'pointer',
        touchAction: 'manipulation',
      }}
    >
      <Icon name='mdi:power' size={20} />
      Spegni tutto
    </button>
  );
}

export function RoomGrid({ areas }: { areas: Area[] }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const hasMore = useHasMoreBelow(gridRef);
  const { columns, rows } = roomGridShape(areas.length);

  const grid: CSSProperties = isPhone
    ? { display: 'grid', gridTemplateColumns: `repeat(${Math.min(areas.length, 2)}, minmax(0, 1fr))`, gap: t.space[3] }
    : {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        // Rows share the Region's height, down to a tile's floor; below it
        // they hold the floor and the grid scrolls.
        gridTemplateRows: `repeat(${rows}, minmax(${ROOM_TILE_MIN_H}px, 1fr))`,
        gap: t.space[3],
        scrollbarWidth: 'none',
        maskImage: hasMore ? 'linear-gradient(to bottom, #000 calc(100% - 40px), transparent)' : undefined,
      };

  return (
    <section
      aria-label='Stanze'
      style={{ display: 'flex', flexDirection: 'column', gap: t.space[3], ...(isPhone ? {} : { flex: 1, minHeight: 0 }) }}
    >
      <SectionLabel action={<SpegniTutto areas={areas} />}>Stanze</SectionLabel>
      <div ref={gridRef} style={grid}>
        {areas.map(area => (
          <RoomTile key={area.id} area={area} />
        ))}
      </div>
    </section>
  );
}
