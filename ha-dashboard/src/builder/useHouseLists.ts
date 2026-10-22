import { useMemo } from 'react';
import { useAreas, useEntities } from '../ha';
import type { HouseLists } from './inspector';

/** The house as the pickers list it: every entity the renderer could show, and every Area. */
export function useHouseLists(): HouseLists {
  const entities = useEntities();
  const areas = useAreas();
  return useMemo(
    () => ({
      entities: [...entities.values()].map(e => ({ id: e.id, name: e.name, domain: e.domain, areaId: e.areaId })),
      areas: areas.map(a => ({ id: a.id, name: a.name })),
    }),
    [entities, areas]
  );
}
