/**
 * PROTOTYPE (#15) -- throwaway, lives on `prototype/phone-layout`, never master.
 *
 * The URL is read once, at module load, before the first render, and the
 * shared tokens are retuned in place for it. Changing a variant reloads the
 * page (see PhonePrototype.tsx), so nothing here has to be reactive.
 *
 *   ?variant=W|A|B|C|D   the layout (W = the wall Panel, untouched)
 *   ?type=wall|arm       the type scale: the wall's, or one for arm's length
 */
import { t } from './theme';

const params = new URLSearchParams(window.location.search);

export const PHONE = {
  variant: params.get('variant') ?? 'W',
  type: params.get('type') === 'arm' ? 'arm' : 'wall',
};

/** How a RoomRow lays itself out on a phone. `off` is the wall row, unchanged. */
export const ROW_MODE: 'off' | 'twoLine' | 'noSlider' =
  PHONE.variant === 'A' || PHONE.variant === 'C' ? 'twoLine' : PHONE.variant === 'B' ? 'noSlider' : 'off';

/** The wall scale, kept so the switcher can print what changed. */
export const WALL_FONT = { ...t.font };

if (PHONE.type === 'arm') {
  // Arm's length (~40 cm) instead of 1-2 m. Display sizes shrink by about a
  // third; body stays near the platform phone body size (iOS 17 pt, Android
  // 16 sp) -- the wall's "body" was already a phone-sized number.
  Object.assign(t.font, { hero: 72, glanceXL: 40, glanceL: 26, glanceM: 19, body: 16, caption: 13 });
  // The gate slab and hero were balanced against each other on the wall.
  t.layout.gateSlab = 84;
}

if (ROW_MODE === 'twoLine') {
  // Tile caps every card at tileMaxH; a two-line row needs more.
  t.layout.tileMaxH = 170;
}
