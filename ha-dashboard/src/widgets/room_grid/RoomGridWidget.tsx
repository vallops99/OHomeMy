/**
 * The Room Grid Widget (#51), ported from `ui/RoomGrid.tsx`: its chosen
 * Areas as Room Tiles under its title, with *All off* beside it.
 *
 * *All off* turns off every light that is on in every one of these Areas
 * (`lightsOn`), not only the chosen ones, so a lamp no tile switches goes off
 * too; while none is on it is visibly not a control: opacity .38, no press,
 * no handler.
 *
 * The tiles share the box's height, never below a tile's floor; past it the
 * grid scrolls, and admits it with a fade at the foot, since a tile cut off
 * by an unannounced scroll boundary is a room that exists with no sign that
 * it does (ADR-0007). How many columns is the old Region's table
 * (`roomGridShape`), cut down in a narrow box (`index.ts`).
 *
 * Each of its Areas is a Member (#75, #78) with its own light, temperature
 * and tap, the light and temperature only from its own Area (ADR-0018): a
 * tile with a Page opens it from its surface, but for its switch and dimmer, as a
 * Room Tile Widget does (ADR-0016, `renderer/tap.ts` `roomTileTap`). The grid's own
 * `on_tap` is unchanged: it gets one Open button beside the whole grid.
 */
import { useMemo, useRef } from 'react';
import { shownTitle } from '../../document/schema';
import { useActions, useAreas, type Area } from '../../ha';
import { tr } from '../../i18n';
import { useDashboardNavigation } from '../../renderer/navigationContext';
import { roomTileTap } from '../../renderer/tap';
import { Icon } from '../../ui/Icon';
import { lightsOn, roomGridShape } from '../../ui/roomGrid';
import { SectionLabel } from '../../ui/SectionLabel';
import { useHasMoreBelow } from '../../ui/useHasMoreBelow';
import { RoomTile } from '../room_tile/RoomTile';
import { inArea } from '../room_tile/roomTile';
import type { WidgetProps } from '../types';
import type { roomGridSchema } from './schema';

function AllOff({ areas }: { areas: Area[] }) {
  const actions = useActions();
  const on = lightsOn(areas);
  const disabled = on.length === 0;
  return (
    <button type='button' className='ohm-room-grid-off' disabled={disabled} onClick={() => actions.turnOff(on)}>
      <Icon name='mdi:power' size={20} />
      {tr('roomGrid.allOff')}
    </button>
  );
}

export function RoomGridWidget({ widget, settings }: WidgetProps<(typeof roomGridSchema)['settings']>) {
  const all = useAreas();
  const navigation = useDashboardNavigation();
  const members = useMemo(
    () => settings.areas.flatMap(member => all.flatMap(area => (area.id === member.area ? [{ area, member }] : []))),
    [all, settings.areas]
  );
  const areas = useMemo(() => members.map(m => m.area), [members]);
  const tilesRef = useRef<HTMLDivElement>(null);
  const hasMore = useHasMoreBelow(tilesRef);
  const title = shownTitle(widget.title, tr('roomGrid.title'));

  return (
    <section className='ohm-room-grid' aria-label={title || tr('roomGrid.title')}>
      <SectionLabel action={<AllOff areas={areas} />}>{title}</SectionLabel>
      <div
        ref={tilesRef}
        className='ohm-room-grid-tiles'
        data-variant={widget.variant}
        data-columns={roomGridShape(areas.length).columns}
        data-more={hasMore}
      >
        {members.map(({ area, member }) => {
          const tap = roomTileTap(member.on_tap, p => navigation.pageName(p) !== undefined);
          return (
            <RoomTile
              key={area.id}
              area={area}
              name={area.name}
              light={inArea(area, member.light)}
              temperature={inArea(area, member.temperature)}
              variant={widget.variant}
              page={tap.as === 'surface' ? tap.page : null}
              member
            />
          );
        })}
      </div>
    </section>
  );
}
