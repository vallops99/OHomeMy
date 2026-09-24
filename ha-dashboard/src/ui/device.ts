/**
 * Is this screen a phone? (#15, ADR-0011)
 *
 * A width breakpoint on the same URL: no second address and no Label says
 * "phone". Narrow in portrait or short in landscape both count, so turning a
 * phone sideways does not hand it the wall's 2x2.
 *
 * Decided once, at load, because the type scale hangs off it and the tokens
 * are module constants (ADR-0001). Neither device crosses the line in use --
 * the wall panel is a fixed 1280x800, and a phone is a phone either way up --
 * so only a desktop window dragged across it needs a reload.
 */
export const PHONE_QUERY = '(max-width: 699px), (max-height: 499px)';

export const isPhone = typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches;
