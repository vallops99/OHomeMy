/**
 * How a Widget opens a Page (#54): the renderer's `DashboardView` owns the
 * Page state (`navigation.ts`) and provides it here, so the renderer's tap
 * wrapper and the Link kind open Pages without the state being threaded
 * through every kind's props.
 *
 * Not `src/ui/NavigationContext.tsx`: that one belongs to the label-driven
 * panel and goes with it at the cutover (#61).
 */
import { createContext, useContext } from 'react';
import type { Id } from '../document/types';

export type DashboardNavigation = {
  /** The Page on screen. */
  page: Id;
  /** Opens an ordinary Page of this Dashboard; anything else is ignored. */
  open: (page: Id) => void;
  /** The name of an ordinary Page of this Dashboard, or `undefined` for anything else. */
  pageName: (page: Id) => string | undefined;
};

/**
 * Outside a Dashboard (a Widget previewed on its own, say) nothing opens and
 * no Page has a name, so a tap target the renderer would draw is not drawn.
 */
const NOWHERE: DashboardNavigation = { page: '', open: () => {}, pageName: () => undefined };

const Context = createContext<DashboardNavigation>(NOWHERE);

export const DashboardNavigationProvider = Context.Provider;

export function useDashboardNavigation(): DashboardNavigation {
  return useContext(Context);
}
