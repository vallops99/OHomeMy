/**
 * The Dashboard's Concerns, for the Widgets that report them (#53): the
 * status chips and the stats. Worked out once per Dashboard, over every
 * entity it shows on any of its Pages (`document/shows.ts`), and ranked by
 * `ha/verdict.ts`; every Widget on every Page reads the same list, so the
 * chip and the stat can never disagree.
 *
 * The registry's lookup comes in as `schemaOf` rather than being imported,
 * so this module, which Widget kinds import, never imports the kinds back.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { WidgetSchema } from '../document/schema';
import { dashboardShows } from '../document/shows';
import type { Dashboard } from '../document/types';
import { useEntities, useHouse } from '../ha';
import { dashboardConcerns, type Concern } from '../ha/verdict';

const ConcernsContext = createContext<readonly Concern[]>([]);

export function DashboardConcerns({
  dashboard,
  schemaOf,
  children,
}: {
  dashboard: Dashboard;
  schemaOf: (kind: string) => WidgetSchema | undefined;
  children: ReactNode;
}) {
  const house = useHouse();
  const entities = useEntities();
  const shows = useMemo(() => dashboardShows(dashboard, schemaOf, house), [dashboard, schemaOf, house]);
  const concerns = useMemo(() => dashboardConcerns(entities.values(), shows), [entities, shows]);
  return <ConcernsContext.Provider value={concerns}>{children}</ConcernsContext.Provider>;
}

/** The Dashboard's Concerns, worst first; empty outside a Dashboard or when all is well. */
export function useConcerns(): readonly Concern[] {
  return useContext(ConcernsContext);
}
