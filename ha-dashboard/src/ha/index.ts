/**
 * The Home Assistant seam.
 *
 * Nothing above this directory imports @hakit/core. Replacing the library
 * means rewriting `registry.ts` and `actions.ts` against the same exported
 * types -- every component and screen keeps compiling.
 */
export type { Area, AreaId, Domain, Entity, EntityId, Label } from './types';
export { useAreas, useByLabel, useByDomain, useEntities, useEntityState, usePower, pickMain, isUnavailableState } from './registry';
export { houseReport, houseTemperature, houseHumidity, type Health, type HealthLevel, type HouseReport } from './health';
export { useActions, type Actions } from './actions';
export { usePage, resolvePage, type Region, type Placed, type PageLayout } from './placement';
