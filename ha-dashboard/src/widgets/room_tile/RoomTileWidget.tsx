/**
 * The Room Tile Widget (#51): one Area, with the light and the temperature
 * its settings name. Its Default title is the Area's own name.
 *
 * Its `on_tap` opens from the tile's surface, not from an Open button beside
 * it (`tap: 'surface'`, ADR-0016): the tile draws that itself.
 */
import { shownTitle } from '../../document/schema';
import { useAreas, useEntityState } from '../../ha';
import { useDashboardNavigation } from '../../renderer/navigationContext';
import { roomTileTap } from '../../renderer/tap';
import type { WidgetProps } from '../types';
import { RoomTile } from './RoomTile';
import type { roomTileSchema } from './schema';

export function RoomTileWidget({ widget, settings }: WidgetProps<(typeof roomTileSchema)['settings']>) {
  const area = useAreas().find(a => a.id === settings.area);
  const light = useEntityState(settings.light);
  const temperature = useEntityState(settings.temperature);
  const navigation = useDashboardNavigation();
  const tap = roomTileTap(widget.on_tap, p => navigation.pageName(p) !== undefined);
  // Checked present by the schema; this covers the render in between.
  if (!area) return null;
  return (
    <RoomTile
      area={area}
      name={shownTitle(widget.title, area.name)}
      light={light}
      temperature={temperature}
      variant={widget.variant}
      page={tap.as === 'surface' ? tap.page : null}
    />
  );
}
