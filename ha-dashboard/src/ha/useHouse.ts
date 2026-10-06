/**
 * What the house has, for the schema module's checks (#50): which entities
 * and Areas a Widget may still name. A Widget naming one Home Assistant no
 * longer has is dropped by the renderer, and the document is not rewritten
 * (`src/document/schema.ts`, `House`).
 */
import { useRegistryData } from '@hakit/core';
import { useMemo } from 'react';
import type { House } from '../document/schema';
import { useEntities } from './registry';

/**
 * An entity is in the house when the Dashboard could render it at all, so a
 * denylisted Domain or an `ignored` entity counts as gone (`useEntities`).
 * An Unavailable one is still there: it renders, as a Fault.
 */
export function useHouse(): House {
  const entities = useEntities();
  const areas = useRegistryData('areas');
  return useMemo(() => {
    const areaIds = new Set(Object.entries(areas ?? {}).map(([id, raw]) => (raw as { area_id?: string }).area_id ?? id));
    return { hasEntity: id => entities.has(id), hasArea: id => areaIds.has(id) };
  }, [entities, areas]);
}
