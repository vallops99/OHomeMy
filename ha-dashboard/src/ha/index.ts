/**
 * The Home Assistant seam.
 *
 * Nothing above this directory imports @hakit/core. Replacing the library
 * means rewriting `registry.ts`, `actions.ts` and `useFeed.ts` against the same exported
 * types -- every component and screen keeps compiling.
 */
export type { Area, AreaId, Domain, Entity, EntityId, Label } from './types';
export {
  useAreas,
  useByLabel,
  usePage,
  useByDomain,
  useEntities,
  useEntityState,
  useLabelOrder,
  useHassUrl,
  useDeviceBattery,
  usePower,
  pickMain,
  isUnavailableState,
} from './registry';
export { houseReport, houseTemperature, houseHumidity, type Health, type HealthLevel, type HouseReport } from './health';
export { useActions, type Actions } from './actions';
export { resolvePage, placedPageFor, openerPage, groupMemberIds, type Region, type Placed, type PageLayout } from './placement';
export { cameraMoving } from './motion';
export { climateHumidity } from './climateHumidity';
export { useFeed, type Feed } from './useFeed';
export { useForecast } from './useForecast';
export type { ForecastDay } from './forecast';
