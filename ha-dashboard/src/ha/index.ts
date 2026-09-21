/**
 * The Home Assistant seam.
 *
 * Nothing above this directory imports @hakit/core. Replacing the library
 * means rewriting `registry.ts` and `actions.ts` against the same exported
 * types -- every component and screen keeps compiling.
 */
export type { Area, AreaId, Domain, Entity, EntityId, Label } from './types';
export { useAreas, useByLabel, useEntities, useEntityState, pickMain, isUnavailableState } from './registry';
export { useActions, type Actions } from './actions';
