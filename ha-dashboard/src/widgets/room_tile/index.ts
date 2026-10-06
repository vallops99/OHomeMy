import { defineWidget } from '../types';
import { ROOM_TILE_CSS } from './RoomTile';
import { RoomTileWidget } from './RoomTileWidget';
import { roomTileSchema } from './schema';

export default defineWidget({
  schema: roomTileSchema,
  Component: RoomTileWidget,
  // The tile's own stylesheet, which the Room Grid's tiles use too: every
  // kind's CSS goes into the shadow root, whichever kinds a Page holds.
  css: ROOM_TILE_CSS,
});
