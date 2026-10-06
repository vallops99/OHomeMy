/**
 * The Camera Wall (CONTEXT.md): a chosen set of cameras, one big Feed beside
 * a strip of the others as captioned thumbnails, or above them in a narrow
 * box. The big one is the camera last tapped; until one is, the first with
 * Motion, else the first in the order chosen here. The choice starts over
 * each time the Page is opened.
 */
import { defineSchema } from '../../document/schema';

export const cameraWallSchema = defineSchema({
  kind: 'camera_wall',
  variants: ['full'],
  titled: false,
  settings: {
    cameras: { type: 'entities', domains: ['camera'] },
  },
});
