import { defineWidget } from '../types';
import { ROOM_TILE_CSS } from './RoomTile';
import { RoomTileWidget } from './RoomTileWidget';
import { roomTileSchema } from './schema';

export default defineWidget({
  schema: roomTileSchema,
  Component: RoomTileWidget,
  // With the chevron to a Page (ADR-0016), which a compact row's name line
  // needs 24 px more for: `npm run fit -- --least`.
  smallest: { full: { width: 111, height: 219 }, compact: { width: 151, height: 65 } },
  // The tile's own stylesheet, which the Room Grid's tiles use too: every
  // kind's CSS goes into the shadow root, whichever kinds a Page holds.
  css: ROOM_TILE_CSS,
  // It switches and dims in place, and its `on_tap` opens from the rest of
  // its surface rather than from an Open button (ADR-0016).
  tap: 'surface',
});
