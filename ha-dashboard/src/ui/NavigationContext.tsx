/**
 * Navigation state: which Page is open, and how to open another one (#14).
 *
 * #2 and ADR-0003 already ruled out a router library, `history`, or a hash --
 * the panel is a Fully Kiosk pane with no address bar and nobody types, so a
 * URL would buy back/forward and deep links nobody can use. Per decision 1 in
 * #14, a Page is therefore not a route at all: it is a name held in React
 * state, and "navigating" is calling `setState` with a different one.
 *
 * A phone is the exception (ADR-0011): it has a back gesture, so there
 * `PhoneShell` owns this context instead, with a stack per tab and one
 * history entry for the gesture to consume. Consumers cannot tell the
 * difference -- they still only call `openPage`.
 *
 * Where that state lives is its own question, because it is neither of
 * ADR-0002's two things. It is not Home Assistant data -- no registry knows
 * "which Page is currently open", that fact exists only on this panel, in
 * this browser tab -- so it does not belong in `src/ha/`. It is also not a
 * component. It is UI *state*, and the two things that need to read or write
 * it (`Dashboard`, which owns it and runs the idle-return timer against it,
 * and the things that call `openPage` -- `PlacementView`'s footer blocks and,
 * since #27, `RoomRow`) are all under `src/ui/`, so a `src/ui/` context is the
 * honest home for it -- it never crosses ADR-0002's seam in either
 * direction.
 *
 * A context rather than prop-threading `openPage` through `PlacementView`
 * into `entitySlot` and every per-Region branch: only a few components
 * (`AreaOpenerBlock`, the home block, and `RoomRow`) ever call it, and
 * `PlacementView` itself does not otherwise need to know navigation exists.
 * Threading a callback prop through `PlacementView` -> the `footer` render
 * branch -> `AreaOpenerBlock` would put a `openPage` parameter on every
 * region and on `entitySlot`, which is dispatched by Domain and has nothing
 * to do with Pages. A context confines the plumbing to the components
 * that actually use it.
 */
import { createContext, useContext } from 'react';

export type Navigation = {
  /** The currently open Page name, e.g. `'main'` or an Area's id. */
  page: string;
  /**
   * Open a Page by name. Flat on the wall, no history stack (ADR-0006,
   * decision 5); on a phone, pushed inside the current tab (ADR-0011).
   */
  openPage: (page: string) => void;
};

const NavigationContext = createContext<Navigation | null>(null);

export const NavigationProvider = NavigationContext.Provider;

/**
 * Thrown, not defaulted, if read outside `Dashboard`'s provider: a footer
 * block that cannot navigate is exactly the "dead control that looks live"
 * `PlacementView.tsx`'s header warns against (carried forward from the
 * deleted `NavBar.tsx`), so a missing provider should fail loudly in
 * development rather than silently produce a block whose tap does nothing.
 */
export function useNavigation(): Navigation {
  const ctx = useContext(NavigationContext);
  if (ctx === null) {
    throw new Error('useNavigation() called outside <NavigationProvider>: no Dashboard above this component owns Page state.');
  }
  return ctx;
}
