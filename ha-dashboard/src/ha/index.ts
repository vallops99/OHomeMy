/**
 * The Home Assistant seam.
 *
 * Nothing above this directory imports @hakit/core. Replacing the library
 * means rewriting `registry.ts`, `actions.ts` and `useFeed.ts` against the same exported
 * types -- every component and screen keeps compiling.
 */
export type { Area, AreaId, Domain, Entity, EntityId } from './types';
export { useAreas, useEntities, useEntityState, useHassUrl, usePortalRoot, useDeviceBattery, isUnavailableState } from './registry';
export { useActions, type Actions } from './actions';
export { groupMemberIds } from './groups';
export { cameraMoving } from './motion';
export { climateHumidity } from './climateHumidity';
export { useFeed, type Feed } from './useFeed';
export { useForecast } from './useForecast';
export type { ForecastDay } from './forecast';
export {
  getDocument,
  subscribeDocument,
  saveDocument,
  getHistory,
  exportDocument,
  importDocument,
  type DocumentChannel,
  type SaveOutcome,
  type ImportOutcome,
  type HistoryEntry,
  type Exported,
} from './document';
export { usePublished, useSaveDocument, useDocumentAdmin, type DocumentAdmin } from './useDocument';
export { useHouse } from './useHouse';
export { useConnected, useEntitiesIn, useStateOf } from './useLive';
export { DEFAULTS_COMMANDS, type Defaults, type UserDefault } from './defaults';
export { useDefaults, type DefaultsAdmin, type DefaultsState } from './useDefaults';
export { useViewerLocale, useHakitLocale, hakitLanguage, viewerLocaleOf, type HassLocale } from './locale';
